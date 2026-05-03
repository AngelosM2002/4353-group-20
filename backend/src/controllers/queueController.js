const QueueEntry = require('../models/QueueEntry');
const Service = require('../models/Service');
const Queue = require('../models/Queue');
const History = require('../models/Notification'); 
const UserCredential = require('../models/UserCredentials'); 

const {
    recordQueueJoined,
    syncNearFrontForService,
    clearNearFrontForUserOnService,
    pushNotification
} = require('../services/notificationTriggers');

/**
 * Higher priority value is served first; ties use earlier joinedAt, then arrivalOrder.
 * this is now handled by mongodb .sort() in the fetch calls.
 */

function normalizeServiceId(raw) {
    if (raw === undefined || raw === null) return null;
    return String(raw);
}

/** * smart feature: uses actual historical duration if available, 
 * otherwise falls back to the expected duration. 
 */
function estimateWaitMinutes(position, expectedDuration, actualAverage) {
    const dur = actualAverage !== null && actualAverage !== undefined ? Number(actualAverage) : Number(expectedDuration);
    const pos = Number(position);
    if (!Number.isFinite(dur) || !Number.isFinite(pos) || dur < 0 || pos < 1) {
        return 0;
    }
    return Math.round(pos * dur);
}

exports.requireAdmin = (req, res, next) => {
    const role = req.headers['x-user-role'] || req.query.role;
    if (!role || String(role).toLowerCase() !== 'admin') {
        return res.status(403).json({ message: 'Administrator access required' });
    }
    next();
};

// GET /api/queues/admin/:serviceId - view current queue (ordered)
exports.getAdminQueue = async (req, res) => {
    const serviceIdKey = normalizeServiceId(req.params.serviceId);
    
    try {
        const service = await Service.findById(serviceIdKey);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        const queueEntries = await QueueEntry.find({ 
            serviceId: serviceIdKey, 
            status: 'waiting' 
        }).sort({ priority: -1, joinedAt: 1 });

        const queue = queueEntries.map((entry, index) => {
            const position = index + 1;
            return {
                position,
                userName: entry.userName,
                userEmail: entry.userEmail,
                joinedAt: entry.joinedAt,
                priority: entry.priority ?? 0,
                estimatedWaitMinutes: estimateWaitMinutes(position, service.expectedDuration, service.actualAverageDuration)
            };
        });

        console.log(`[ADMIN] View queue for service ${service.name} (${queue.length} waiting)`);

        res.json({
            service,
            queue,
            count: queue.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving queue', error: error.message });
    }
};

// POST /api/queues/admin/:serviceId/serve-next - remove next person in order, and add to history
exports.serveNext = async (req, res) => {
    const serviceIdKey = normalizeServiceId(req.params.serviceId);
    
    try {
        const service = await Service.findById(serviceIdKey);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        const servedEntry = await QueueEntry.findOne({ 
            serviceId: serviceIdKey, 
            status: 'waiting' 
        }).sort({ priority: -1, joinedAt: 1 });

        if (!servedEntry) {
            return res.status(400).json({ message: 'Queue is empty' });
        }

        // track serve time for smart logic
        const now = new Date();
        const waitDurationMs = now - servedEntry.joinedAt;
        const waitMinutes = waitDurationMs / (1000 * 60);

        servedEntry.status = 'served';
        servedEntry.servedAt = now;
        await servedEntry.save();

        // update service average duration (smart feature calculation)
        const oldTotal = service.totalServed || 0;
        const oldAvg = service.actualAverageDuration !== null ? service.actualAverageDuration : service.expectedDuration;
        const newTotal = oldTotal + 1;
        const newAvg = ((oldAvg * oldTotal) + waitMinutes) / newTotal;

        service.actualAverageDuration = newAvg;
        service.totalServed = newTotal;
        await service.save();

        await pushNotification({
            userEmail: servedEntry.userEmail,
            message: `You were served for "${service.name}"`,
            type: 'served'
        });

        console.log(`[SMART] Updated average duration for ${service.name}: ${newAvg.toFixed(2)} mins`);

        syncNearFrontForService(serviceIdKey);

        const remainingCount = await QueueEntry.countDocuments({ serviceId: serviceIdKey, status: 'waiting' });

        res.json({
            message: 'Next user served',
            served: {
                userName: servedEntry.userName,
                userEmail: servedEntry.userEmail,
                joinedAt: servedEntry.joinedAt,
                priority: servedEntry.priority ?? 0
            },
            remaining: remainingCount,
            newAverageDuration: newAvg
        });
    } catch (error) {
        res.status(500).json({ message: 'Serve next failed', error: error.message });
    }
};

// POST /api/queues/join
exports.joinQueue = async (req, res) => {
    const { serviceId, userName, userEmail, userId } = req.body; 

    if (!serviceId || !userName || !userEmail) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        const alreadyIn = await QueueEntry.findOne({ 
            serviceId: serviceId, 
            userEmail: userEmail, 
            status: 'waiting' 
        });

        if (alreadyIn) {
            return res.status(400).json({ message: 'You are already in this queue' });
        }

        let priority = service.priorityLevel;
        if (req.body.priority !== undefined && req.body.priority !== '') {
            const p = parseInt(req.body.priority, 10);
            if (!Number.isNaN(p)) {
                priority = p;
            }
        }

        let queue = await Queue.findOne({ serviceId: serviceId, status: 'open' });
        if (!queue) {
            queue = await Queue.create({ serviceId: serviceId, status: 'open' });
            console.log(`[QUEUE] Auto-created open Queue for service ${service.name}`);
        }

        const newEntry = await QueueEntry.create({
            serviceId,
            queueId: queue._id,
            userId: userId || null, 
            userName,
            userEmail,
            priority,
            position: 0, 
            status: 'waiting'
        });

        const totalAhead = await QueueEntry.countDocuments({
            serviceId: serviceId,
            status: 'waiting',
            $or: [
                { priority: { $gt: priority } },
                { priority: priority, joinedAt: { $lt: newEntry.joinedAt } }
            ]
        });

        const position = totalAhead + 1;

        console.log(`[QUEUE] User ${userName} (${userEmail}) joined database queue for ${service.name}`);

        recordQueueJoined(userEmail, service, position, totalAhead + 1);
        syncNearFrontForService(serviceId);

        res.status(201).json({
            message: 'Joined queue successfully',
            position,
            priority,
            estimatedWaitMinutes: estimateWaitMinutes(position, service.expectedDuration, service.actualAverageDuration)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error joining queue', error: error.message });
    }
};

// POST /api/queues/leave
exports.leaveQueue = async (req, res) => {
    const { serviceId, userEmail } = req.body;

    if (!serviceId || !userEmail) {
        return res.status(400).json({ message: 'serviceId and userEmail are required' });
    }

    try {
        const entry = await QueueEntry.findOne({ 
            serviceId: serviceId, 
            userEmail: userEmail, 
            status: 'waiting' 
        });

        if (!entry) {
            return res.status(404).json({ message: 'User was not found in this queue' });
        }

        const service = await Service.findById(serviceId);
        
        entry.status = 'cancelled';
        await entry.save();

        const user = await UserCredential.findOne({ email: userEmail.toLowerCase() });

        if (user) {
            await History.create({
                userId: user._id,
                message: `You left "${service ? service.name : 'the queue'}"`,
                status: 'sent',
                type: 'cancelled'
            });
        }

        clearNearFrontForUserOnService(userEmail, serviceId);
        syncNearFrontForService(serviceId);

        return res.json({ message: 'Left queue successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error leaving queue', error: error.message });
    }
};

// GET /api/queues/history/:email
exports.getUserHistory = async (req, res) => {
    const { email } = req.params;
    
    if (!email) {
        return res.status(400).json({ message: 'Email parameter is required' });
    }

    try {
        const userHistory = await History.find()
            .populate('userId')
            .sort({ timestamp: -1 });
            
        const filteredHistory = userHistory.filter(h => {
            if (h.userId && h.userId.email && h.userId.email.toLowerCase() === email.toLowerCase()) {
                return true;
            }
            if (h.message && h.message.toLowerCase().includes(email.toLowerCase())) {
                return true;
            }
            return false;
        });
        
        res.json(filteredHistory);
    } catch (error) {
        res.status(500).json([]);
    }
};

// GET /api/queues/status?email=user@example.com
exports.getUserStatus = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ email: 'Email is required' });
    }

    try {
        const entry = await QueueEntry.findOne({ userEmail: email, status: 'waiting' });

        if (!entry) {
            return res.json({ inQueue: false, position: -1, service: null, estimatedWaitMinutes: null });
        }

        const service = await Service.findById(entry.serviceId);
        
        const totalAhead = await QueueEntry.countDocuments({
            serviceId: entry.serviceId,
            status: 'waiting',
            $or: [
                { priority: { $gt: entry.priority } },
                { priority: entry.priority, joinedAt: { $lt: entry.joinedAt } }
            ]
        });

        const position = totalAhead + 1;

        res.json({
            inQueue: true,
            position,
            service,
            estimatedWaitMinutes: estimateWaitMinutes(position, service.expectedDuration, service.actualAverageDuration)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error checking status', error: error.message });
    }
};
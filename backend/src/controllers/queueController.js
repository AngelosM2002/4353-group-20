// importing mongoose models instead of memorydata arrays
const QueueEntry = require('../models/QueueEntry');
const Service = require('../models/Service');
const History = require('../models/Notification'); // using the notification/history model

const {
    recordQueueJoined,
    syncNearFrontForService,
    clearNearFrontForUserOnService
} = require('../services/notificationTriggers');

/**
 * Higher priority value is served first; ties use earlier joinedAt, then arrivalOrder.
 * this is now handled by mongodb .sort() in the fetch calls.
 */

function normalizeServiceId(raw) {
    if (raw === undefined || raw === null) return null;
    return String(raw);
}

/** Rule-based wait (assignment): position x expected duration (minutes per slot ahead). */
function estimateWaitMinutes(position, expectedDuration) {
    const dur = Number(expectedDuration);
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

        // fetch from mongodb with specific sorting: priority DESC, joinedAt ASC
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
                estimatedWaitMinutes: estimateWaitMinutes(position, service.expectedDuration)
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

        // find the first person in line based on sorting rules
        const servedEntry = await QueueEntry.findOne({ 
            serviceId: serviceIdKey, 
            status: 'waiting' 
        }).sort({ priority: -1, joinedAt: 1 });

        if (!servedEntry) {
            return res.status(400).json({ message: 'Queue is empty' });
        }

        // update status to served in database
        servedEntry.status = 'served';
        await servedEntry.save();

        // history logic - using notification model to track history
        await History.create({
            userId: servedEntry.userId,
            message: `Served: ${service.name} at ${new Date().toLocaleString()}`,
            status: 'sent'
        });

        console.log(`[HISTORY] User ${servedEntry.userEmail} was officially Served.`);
        console.log(`[ADMIN] Served next: ${servedEntry.userEmail} for service ${service.name}`);

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
            remaining: remainingCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Serve next failed', error: error.message });
    }
};

// POST /api/queues/join
exports.joinQueue = async (req, res) => {
    const { serviceId, userName, userEmail, userId } = req.body; // added userId for database reference

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

        // creating the database entry
        const newEntry = await QueueEntry.create({
            serviceId,
            userId: userId || null, // ensure this is passed from frontend or session
            userName,
            userEmail,
            priority,
            position: 0, // temporary, calculated on retrieval
            status: 'waiting'
        });

        // calculate position for response
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
            estimatedWaitMinutes: estimateWaitMinutes(position, service.expectedDuration)
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

        if (entry) {
            const service = await Service.findById(serviceId);
            
            // update entry to cancelled status
            entry.status = 'cancelled';
            await entry.save();

            // create history entry in notification collection
            await History.create({
                userId: entry.userId,
                message: `Left Queue: ${service ? service.name : 'Unknown Service'}`,
                status: 'sent'
            });

            console.log(`[HISTORY] Recorded cancellation for ${userEmail}`);
            console.log(`[QUEUE] User ${userEmail} successfully removed from database`);
            
            clearNearFrontForUserOnService(userEmail, serviceId);
            syncNearFrontForService(serviceId);

            return res.json({ message: 'Left queue successfully' });
        }

        return res.status(404).json({ message: 'User was not found in this queue' });
    } catch (error) {
        res.status(500).json({ message: 'Error leaving queue', error: error.message });
    }
};

//get user history
exports.getUserHistory = async (req, res) => {
    const { email } = req.params;
    
    if (!email) {
        return res.status(400).json({ message: 'Email parameter is required' });
    }

    try {
        // fetching from notification/history collection in mongodb
        const userHistory = await History.find().populate('userId');
        // filtering by email (in a real app, you'd query by userId directly)
        const filteredHistory = userHistory.filter(h => h.userId && h.userId.email === email);
        
        res.json(filteredHistory);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history', error: error.message });
    }
};

// GET /api/queues/status?email=user@example.com
exports.getUserStatus = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const entry = await QueueEntry.findOne({ userEmail: email, status: 'waiting' });

        if (!entry) {
            return res.json({ inQueue: false, position: -1, service: null, estimatedWaitMinutes: null });
        }

        const service = await Service.findById(entry.serviceId);
        
        // calculate position based on priority and time
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
            estimatedWaitMinutes: estimateWaitMinutes(position, service.expectedDuration)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error checking status', error: error.message });
    }
};
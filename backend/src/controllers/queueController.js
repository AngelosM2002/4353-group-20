const { queues, services } = require('../data/memoryData');

// POST /api/queues/join
exports.joinQueue = (req, res) => {
    const { serviceId, userName, userEmail } = req.body;
    
    if (!serviceId || !userName || !userEmail) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const service = services.find(s => s.id === parseInt(serviceId));
    if (!service) {
        return res.status(404).json({ message: 'Service not found' });
    }

    if (!queues[serviceId]) {
        queues[serviceId] = [];
    }

    const alreadyIn = queues[serviceId].some(u => u.userEmail === userEmail);
    if (alreadyIn) {
        return res.status(400).json({ message: 'You are already in this queue' });
    }

    const queueEntry = {
        userName,
        userEmail,
        joinedAt: new Date().toISOString()
    };

    queues[serviceId].push(queueEntry);
    
    // Now service.name works perfectly
    console.log(`[QUEUE] User ${userName} (${userEmail}) is joining queue for ${service.name}`);
    console.log(`[INFO] Current queue length for ${service.name}: ${queues[serviceId].length}`);
    
    res.status(201).json({ 
        message: 'Joined queue successfully',
        position: queues[serviceId].length 
    });
};

// POST /api/queues/leave
exports.leaveQueue = (req, res) => {
    const { serviceId, userEmail } = req.body;

    if (!queues[serviceId]) {
        return res.status(404).json({ message: 'Queue not found' });
    }

    const userToLeave = queues[serviceId].find(u => u.userEmail === userEmail);
    const userName = userToLeave ? userToLeave.userName : "Unknown User";

    const initialLength = queues[serviceId].length;
    queues[serviceId] = queues[serviceId].filter(u => u.userEmail !== userEmail);

    if (queues[serviceId].length === initialLength) {
        return res.status(404).json({ message: 'User not found in this queue' });
    }

    console.log(`[QUEUE] User ${userName} has left the queue for service ID: ${serviceId}`);
    res.json({ message: 'Left queue successfully' });
};

// GET /api/queues/status?email=user@example.com
exports.getUserStatus = (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    let status = {
        inQueue: false,
        position: -1,
        service: null
    };

    for (const serviceId in queues) {
        const index = queues[serviceId].findIndex(u => u.userEmail === email);
        
        if (index !== -1) {
            const service = services.find(s => s.id === parseInt(serviceId));
            status = {
                inQueue: true,
                position: index + 1,
                service: service
            };
            break; 
        }
    }

    res.json(status);
};
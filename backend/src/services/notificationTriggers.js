// importing mongoose models now
const Notification = require('../models/Notification');
const UserCredential = require('../models/UserCredentials');
const QueueEntry = require('../models/QueueEntry');
const Service = require('../models/Service');

const CLOSE_TO_SERVE_N = 3;

//save to mongodb now
async function pushNotification({ userEmail, type, message, serviceId, serviceName, meta }) {
    try {
        const user = await UserCredential.findOne({ email: userEmail.toLowerCase() });
        if (!user) return null;

        const row = await Notification.create({
            userId: user._id,
            type: type || 'notice',
            message: message,
            status: 'sent', 
            timestamp: new Date(),
            meta: meta ? JSON.stringify(meta) : null 
        });

        console.log(`[DATABASE-NOTIFY] ${type} -> ${userEmail}: ${message}`);
        return row;
    } catch (error) {
        console.error("[ERROR] Failed to save notification to MongoDB:", error);
    }
}

/**
 * Top N (N=3): users in positions 1..3 get a one-time "close to serve" ping.
 */
async function syncNearFrontForService(serviceIdKey) {
    try {
        const service = await Service.findById(serviceIdKey);
        if (!service) return;

        // get the top 3 people currently waiting in the database
        const list = await QueueEntry.find({ 
            serviceId: serviceIdKey, 
            status: 'waiting' 
        }).sort({ priority: -1, joinedAt: 1 }).limit(CLOSE_TO_SERVE_N);

        for (let i = 0; i < list.length; i++) {
            const position = i + 1;
            const entry = list[i];

            const alreadyNotified = await Notification.findOne({
                userId: entry.userId,
                message: { $regex: service.name },
                type: 'close_to_serve'
            });

            if (!alreadyNotified) {
                await pushNotification({
                    userEmail: entry.userEmail,
                    type: 'close_to_serve',
                    message: `You are in the front spots for "${service.name}" (position ${position}).`,
                    serviceId: service._id,
                    serviceName: service.name
                });
            }
        }
    } catch (error) {
        console.error("[ERROR] syncNearFront failed:", error);
    }
}

async function recordQueueJoined(userEmail, service, position, queueLength) {
    await pushNotification({
        userEmail,
        type: 'queue_joined',
        message: `You joined "${service.name}" (position ${position} of ${queueLength}).`,
        serviceId: service._id,
        serviceName: service.name
    });
}

function clearNearFrontForUserOnService(userEmail, serviceIdKey) {
    console.log(`[INFO] Request to clear front-status for ${userEmail}`);
}

module.exports = {
    CLOSE_TO_SERVE_N,
    pushNotification,
    syncNearFrontForService,
    recordQueueJoined,
    clearNearFrontForUserOnService
};
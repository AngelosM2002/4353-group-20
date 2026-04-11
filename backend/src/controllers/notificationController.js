// importing the mongoose model instead of memorydata
const Notification = require('../models/Notification');
const UserCredential = require('../models/UserCredentials');

// GET /api/notifications?email=user@example.com
exports.listForUser = async (req, res) => {
    const email = req.query.email;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'email query parameter is required' });
    }

    try {
        const normalized = email.trim().toLowerCase();

        // find the user first to get their database _id
        const user = await UserCredential.findOne({ email: normalized });
        
        if (!user) {
            return res.json({ notifications: [], unreadCount: 0 });
        }

        // fetch notifications from mongodb for this specific user
        const items = await Notification.find({ userId: user._id }).sort({ timestamp: -1 });

        res.json({
            notifications: items,
            // status 'sent' acts as unread, 'viewed' acts as read
            unreadCount: items.filter((n) => n.status === 'sent').length
        });
    } catch (error) {
        res.status(500).json({ message: 'error retrieving notifications', error: error.message });
    }
};

// PATCH /api/notifications/:id/read?email=user@example.com
exports.markRead = async (req, res) => {
    const { id } = req.params; // this is now the mongodb _id string
    const email = req.query.email;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'email query parameter is required' });
    }

    try {
        const normalized = email.trim().toLowerCase();
        
        // find the notification and ensure it belongs to the right user
        const notification = await Notification.findById(id).populate('userId');

        if (!notification || !notification.userId || notification.userId.email !== normalized) {
            return res.status(404).json({ message: 'notification not found or access denied' });
        }

        // update status to viewed in the database
        notification.status = 'viewed';
        await notification.save();

        res.json({ message: 'marked as read', notification });
    } catch (error) {
        res.status(500).json({ message: 'failed to update notification', error: error.message });
    }
};
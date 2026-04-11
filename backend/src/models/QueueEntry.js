const mongoose = require('mongoose');

const queueEntrySchema = new mongoose.Schema({
    serviceId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Service', 
        required: true 
    },
    queueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Queue'
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'UserCredentials' 
    },
    userName: { 
        type: String, 
        required: true 
    },
    userEmail: { 
        type: String, 
        required: true 
    },
    position: { 
        type: Number, 
        required: false 
    },
    priority: {
        type: Number,
        default: 0
    },
    status: { 
        type: String, 
        enum: ['waiting', 'served', 'cancelled'], 
        default: 'waiting' 
    },
    joinedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

module.exports = mongoose.model('QueueEntry', queueEntrySchema);
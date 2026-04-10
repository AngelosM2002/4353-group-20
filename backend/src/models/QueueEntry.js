const mongoose = require('mongoose');

const queueEntrySchema = new mongoose.Schema({
    // reference to the service being joined
    serviceId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Service', 
        required: true 
    },
    // reference to the user - made optional in case of legacy sessions or guest logic
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'UserCredential' 
    },
    userName: { 
        type: String, 
        required: true 
    },
    userEmail: { 
        type: String, 
        required: true 
    },
    // changed required to false because position is calculated dynamically
    position: { 
        type: Number, 
        required: false 
    },
    // tie-breaker for users with same priority
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
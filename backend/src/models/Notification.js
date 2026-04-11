const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'UserCredential', 
        required: true 
    },
    type: { 
        type: String, 
        default: 'notice' 
    },
    message: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['sent', 'viewed'], 
        default: 'sent' 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    },
    meta: { 
        type: String, 
        default: null 
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'UserCredentials'
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name must be 100 characters or fewer'],
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    contactInfo: {
        type: String,
        default: ''
    },
    preferences: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('UserProfile', userProfileSchema);

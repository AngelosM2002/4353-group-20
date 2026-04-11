const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: [true, 'Service ID is required']
    },
    status: {
        type: String,
        enum: {
            values: ['open', 'closed'],
            message: 'Status must be "open" or "closed"'
        },
        default: 'open'
    }
}, {
    timestamps: true // adds createdAt (= "Created date") and updatedAt automatically
});

module.exports = mongoose.model('Queue', queueSchema);

const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    expectedDuration: { type: Number, required: true },
    priorityLevel: { type: Number, required: true },
    status: { type: String, default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
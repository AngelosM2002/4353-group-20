const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    expectedDuration: { type: Number, required: true },
    priorityLevel: { type: Number, required: true },
    status: { type: String, default: 'active' },
    // track actual performance for smart wait-time
    actualAverageDuration: { type: Number, default: null },
    totalServed: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
const Service = require('../models/Service');

// fetch: create a new service in mongodb
exports.createService = async (req, res) => {
    const { name, description, expectedDuration, priorityLevel } = req.body;

    // validation
    if (!priorityLevel || isNaN(parseInt(priorityLevel))) {
        return res.status(400).json({ message: 'service priority is required and must be a number.' });
    }
    if (!name || !expectedDuration) {
        return res.status(400).json({ message: 'name and duration are required.' });
    }

    try {
        const newService = new Service({
            name,
            description,
            expectedDuration: parseInt(expectedDuration),
            priorityLevel: parseInt(priorityLevel),
            status: 'active'
        });

        // this saves the data to your mongodb atlas cluster
        await newService.save();

        console.log(`[admin] database: created new service: ${name}`);
        res.status(201).json(newService);
    } catch (error) {
        console.error('[SERVICE CREATE ERROR]', error.message);
        res.status(500).json({ message: error.message || 'error saving to database' });
    }
};

// fetch: list all services from mongodb
exports.getServices = async (req, res) => {
    try {
        const services = await Service.find();
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: 'error retrieving services', error: error.message });
    }
};

// fetch: update service in mongodb using _id
exports.updateService = async (req, res) => {
    const { id } = req.params;
    const { name, description, expectedDuration, priorityLevel, status } = req.body;

    try {
        const updatedService = await Service.findByIdAndUpdate(
            id,
            { name, description, expectedDuration, priorityLevel, status },
            { returnDocument: 'after' } // returns the modified document
        );

        if (!updatedService) {
            return res.status(404).json({ message: 'service not found' });
        }

        res.json({ message: 'service updated in database', service: updatedService });
    } catch (error) {
        res.status(500).json({ message: 'update failed', error: error.message });
    }
};

// fetch: delete service from mongodb
exports.deleteService = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedService = await Service.findByIdAndDelete(id);

        if (!deletedService) {
            return res.status(404).json({ message: 'service not found' });
        }

        res.json({ message: 'service deleted from database' });
    } catch (error) {
        res.status(500).json({ message: 'delete failed', error: error.message });
    }
};
const { services } = require('../data/memoryData');

// Unique ID counter for services
let serviceIdCounter = 1;

exports.createService = (req, res) => {
    const { name, description, expectedDuration, priorityLevel } = req.body;

    // ensure priorityLevel is present and is a valid number
    if (!priorityLevel || isNaN(parseInt(priorityLevel))) {
        return res.status(400).json({ 
            message: 'Service Priority is required and must be a number.' 
        });
    }

    // validaiton for other fields
    if (!name || !expectedDuration) {
        return res.status(400).json({ message: 'Name and Duration are required.' });
    }

    const newService = {
        id: services.length + 1,
        name,
        description,
        expectedDuration: parseInt(expectedDuration),
        priorityLevel: parseInt(priorityLevel), // Store as integer
        status: 'active'
    };

    services.push(newService);
    
    console.log(`[ADMIN] Created new service: ${name} (Priority: ${priorityLevel})`);
    res.status(201).json(newService);
};
exports.getServices = (req, res) => {
    res.json(services);
};


//service update logic
exports.updateService = (req, res) => {
    const serviceId = parseInt(req.params.id);
    const { name, description, expectedDuration, priorityLevel } = req.body;

    const serviceIndex = services.findIndex(s => s.id === serviceId);

    if (serviceIndex === -1) {
        return res.status(404).json({ message: 'Service not found' });
    }

    //update fields if provided in req
    if (name) services[serviceIndex].name = name;
    if (description) services[serviceIndex].description = description;
    if (expectedDuration) services[serviceIndex].expectedDuration = expectedDuration;
    if (priorityLevel !== undefined) services[serviceIndex].priorityLevel = priorityLevel;

    res.json({ message: 'Service updated successfully', service: services[serviceIndex] });
};

exports.deleteService = (req, res) => {
    const serviceId = parseInt(req.params.id);
    const serviceIndex = services.findIndex(s => s.id === serviceId);

    if (serviceIndex === -1) {
        return res.status(404).json({ message: 'Service not found' });
    }

    services.splice(serviceIndex, 1);
    res.json({ message: 'Service deleted successfully' });
};
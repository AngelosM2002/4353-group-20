//array store user objects 
const users = [];

//array store services
/**
 * Stores active queues for each service.
 * Format: { 
 * "serviceId": [ { userName: '...', userEmail: '...', joinedAt: '...' }, ... ] 
 * }
 */
const services = [];

//object will store  services and their queues
const queues = {};

// per-service monotonic counter for stable arrival tie-breaks after sort
const queueArrivalSeq = {};

module.exports = {
    users,
    services,
    queues,
    queueArrivalSeq
};
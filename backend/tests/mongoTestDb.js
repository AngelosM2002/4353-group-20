const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

/**
 * Shared harness: one in-memory replica set URI per test file lifecycle.
 */
async function connectMongoMemory() {
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    return mongoServer;
}

async function disconnectMongoMemory(mongoServer) {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
}

/** Clears all documents from every collection (same DB the app uses in tests). */
async function clearDatabase() {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((col) => col.deleteMany({})));
}

module.exports = {
    connectMongoMemory,
    disconnectMongoMemory,
    clearDatabase
};

const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the connection string from environment variables.
 * Call this once at server startup before listening for requests.
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;

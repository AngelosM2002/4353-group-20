const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./src/config/db');

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'queuesmart backend is active' });
});

// import routes from  files in src/routes folder
const authroutes = require('./src/routes/authRoutes');
const serviceroutes = require('./src/routes/serviceRoutes');
const queueRoutes = require('./src/routes/queueRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');

// link routes to endpoints
app.use('/api/auth', authroutes);
app.use('/api/services', serviceroutes);
app.use('/api/queues', queueRoutes);
app.use('/api/notifications', notificationRoutes);

//error handling for unknown routes
app.use((req, res) => {
    res.status(404).json({ message: 'resource not found' });
});

//global error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'an internal server error occurred',
        error: err.message 
    });
});

// start server — connect to MongoDB first, then listen
if (require.main === module) {
    connectDB().then(() => {
        app.listen(port, () => {
            console.log(`server is running on http://localhost:${port}`);
        });
    });
}

module.exports = app; // exported for unit testing with supertest
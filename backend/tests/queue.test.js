const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Service = require('../src/models/Service');
const QueueEntry = require('../src/models/QueueEntry');
const Notification = require('../src/models/Notification');
const UserCredentials = require('../src/models/UserCredentials');
const { connectMongoMemory, disconnectMongoMemory, clearDatabase } = require('./mongoTestDb');

let mongoServer;

async function createTestService(overrides = {}) {
    return Service.create({
        name: 'Test Service',
        description: 'Test description',
        expectedDuration: 10,
        priorityLevel: 1,
        status: 'active',
        ...overrides
    });
}

async function registerUser(name, email, password = 'password123') {
    const res = await request(app).post('/api/auth/register').send({
        name,
        email,
        password,
        role: 'User'
    });
    expect(res.status).toBe(201);
    return UserCredentials.findOne({ email: email.toLowerCase() });
}

beforeAll(async () => {
    mongoServer = await connectMongoMemory();
});

afterAll(async () => {
    await disconnectMongoMemory(mongoServer);
});

beforeEach(async () => {
    await clearDatabase();
});

describe('Queue API (MongoDB)', () => {
    describe('POST /api/queues/join', () => {
        it('creates a queue entry and returns position plus estimated wait', async () => {
            const svc = await createTestService();
            const res = await request(app).post('/api/queues/join').send({
                serviceId: svc._id.toString(),
                userName: 'John Doe',
                userEmail: 'john@example.com'
            });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Joined queue successfully');
            expect(res.body.position).toBe(1);
            expect(res.body.estimatedWaitMinutes).toBe(10);

            const entry = await QueueEntry.findOne({
                serviceId: svc._id,
                userEmail: 'john@example.com',
                status: 'waiting'
            });
            expect(entry).not.toBeNull();
        });

        it('returns 400 for missing fields', async () => {
            const svc = await createTestService();
            const res = await request(app).post('/api/queues/join').send({
                serviceId: svc._id.toString(),
                userName: 'Only Name'
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/missing required fields/i);
        });

        it('returns 404 if the service does not exist', async () => {
            const missingId = new mongoose.Types.ObjectId().toString();
            const res = await request(app).post('/api/queues/join').send({
                serviceId: missingId,
                userName: 'X',
                userEmail: 'x@example.com'
            });
            expect(res.status).toBe(404);
        });

        it('blocks duplicate waiting entries for the same user and service', async () => {
            const svc = await createTestService();
            const body = {
                serviceId: svc._id.toString(),
                userName: 'John',
                userEmail: 'john@example.com'
            };
            await request(app).post('/api/queues/join').send(body);

            const res = await request(app).post('/api/queues/join').send(body);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already in this queue/i);
            expect(await QueueEntry.countDocuments({ serviceId: svc._id, status: 'waiting' })).toBe(1);
        });
    });

    describe('GET /api/queues/status', () => {
        it('returns inQueue: false when the user is absent', async () => {
            const res = await request(app).get('/api/queues/status').query({ email: 'nobody@example.com' });
            expect(res.status).toBe(200);
            expect(res.body.inQueue).toBe(false);
        });

        it('returns correct position when the user is present', async () => {
            const svc = await createTestService();
            await request(app).post('/api/queues/join').send({
                serviceId: svc._id.toString(),
                userName: 'Jane',
                userEmail: 'jane@example.com'
            });

            const res = await request(app).get('/api/queues/status').query({ email: 'jane@example.com' });
            expect(res.status).toBe(200);
            expect(res.body.inQueue).toBe(true);
            expect(res.body.position).toBe(1);
            expect(res.body.service._id.toString()).toBe(svc._id.toString());
            expect(res.body.estimatedWaitMinutes).toBe(10);
        });
    });

    describe('POST /api/queues/leave', () => {
        it('marks the entry cancelled in MongoDB and returns success', async () => {
            const svc = await createTestService();
            await registerUser('John', 'john@example.com');
            await request(app).post('/api/queues/join').send({
                serviceId: svc._id.toString(),
                userName: 'John',
                userEmail: 'john@example.com'
            });

            const res = await request(app).post('/api/queues/leave').send({
                serviceId: svc._id.toString(),
                userEmail: 'john@example.com'
            });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Left queue successfully');

            const entry = await QueueEntry.findOne({ userEmail: 'john@example.com', serviceId: svc._id });
            expect(entry.status).toBe('cancelled');

            expect(await QueueEntry.countDocuments({ serviceId: svc._id, status: 'waiting' })).toBe(0);
        });
    });

    describe('GET /api/queues/admin/:serviceId', () => {
        it('returns entries ordered by priority desc, then join time', async () => {
            const svc = await createTestService();

            await QueueEntry.create({
                serviceId: svc._id,
                userName: 'LowPri',
                userEmail: 'low@example.com',
                priority: 1,
                status: 'waiting',
                joinedAt: new Date('2024-01-01T12:00:00.000Z')
            });
            await QueueEntry.create({
                serviceId: svc._id,
                userName: 'HighPri',
                userEmail: 'high@example.com',
                priority: 5,
                status: 'waiting',
                joinedAt: new Date('2024-01-02T12:00:00.000Z')
            });

            const res = await request(app).get(`/api/queues/admin/${svc._id}`).set('x-user-role', 'admin');

            expect(res.status).toBe(200);
            expect(res.body.queue.length).toBe(2);
            expect(res.body.queue[0].userEmail).toBe('high@example.com');
            expect(res.body.queue[1].userEmail).toBe('low@example.com');
        });
    });

    describe('POST /api/queues/admin/:serviceId/serve-next', () => {
        it('marks the next entry as served and decreases remaining waiting count', async () => {
            const svc = await createTestService();
            await request(app).post('/api/queues/join').send({
                serviceId: svc._id.toString(),
                userName: 'Next',
                userEmail: 'next@example.com'
            });

            const res = await request(app)
                .post(`/api/queues/admin/${svc._id}/serve-next`)
                .set('x-user-role', 'admin');

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Next user served');
            expect(res.body.remaining).toBe(0);

            const entry = await QueueEntry.findOne({ userEmail: 'next@example.com', serviceId: svc._id });
            expect(entry.status).toBe('served');
        });
    });

    describe('GET /api/queues/history/:email', () => {
        it('returns history records for that user', async () => {
            await registerUser('Pat', 'pat@example.com');
            const user = await UserCredentials.findOne({ email: 'pat@example.com' });

            await Notification.create({
                userId: user._id,
                message: 'Served: Lab visit for pat@example.com',
                type: 'served',
                status: 'sent',
                timestamp: new Date()
            });

            const res = await request(app).get('/api/queues/history/pat@example.com');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            const match = res.body.find(
                (h) => h.message && h.message.toLowerCase().includes('pat@example.com')
            );
            expect(match).toBeDefined();
        });
    });
});

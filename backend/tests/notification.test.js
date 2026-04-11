const request = require('supertest');
const app = require('../server');
const Notification = require('../src/models/Notification');
const UserCredentials = require('../src/models/UserCredentials');
const Service = require('../src/models/Service');
const { connectMongoMemory, disconnectMongoMemory, clearDatabase } = require('./mongoTestDb');

let mongoServer;

beforeAll(async () => {
    mongoServer = await connectMongoMemory();
});

afterAll(async () => {
    await disconnectMongoMemory(mongoServer);
});

beforeEach(async () => {
    await clearDatabase();
});

async function registerUser(email = 'user@example.com') {
    const res = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email,
        password: 'password123',
        role: 'User'
    });
    expect(res.status).toBe(201);
}

async function seedServiceAndJoin(email) {
    const svc = await Service.create({
        name: 'Test Service',
        description: 'd',
        expectedDuration: 10,
        priorityLevel: 1,
        status: 'active'
    });
    await request(app).post('/api/queues/join').send({
        serviceId: svc._id.toString(),
        userName: 'U',
        userEmail: email
    });
    return svc;
}

describe('Notification API (MongoDB)', () => {
    it('GET /api/notifications returns 400 if email is missing', async () => {
        const res = await request(app).get('/api/notifications');
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('email query parameter is required');
    });

    it('GET /api/notifications returns an empty list for an unknown user', async () => {
        const res = await request(app).get('/api/notifications').query({ email: 'ghost@example.com' });
        expect(res.status).toBe(200);
        expect(res.body.notifications).toEqual([]);
        expect(res.body.unreadCount).toBe(0);
    });

    it('GET /api/notifications returns notifications sorted newest first with correct unreadCount', async () => {
        await registerUser('user@example.com');
        const user = await UserCredentials.findOne({ email: 'user@example.com' });

        const older = await Notification.create({
            userId: user._id,
            type: 'queue_joined',
            message: 'older',
            status: 'sent',
            timestamp: new Date('2020-01-01T12:00:00.000Z')
        });
        const newer = await Notification.create({
            userId: user._id,
            type: 'queue_joined',
            message: 'newer',
            status: 'sent',
            timestamp: new Date('2025-01-01T12:00:00.000Z')
        });

        const res = await request(app).get('/api/notifications').query({ email: 'user@example.com' });
        expect(res.status).toBe(200);
        const items = res.body.notifications;
        expect(items.length).toBe(2);
        expect(items[0]._id.toString()).toBe(newer._id.toString());
        expect(items[1]._id.toString()).toBe(older._id.toString());
        expect(res.body.unreadCount).toBe(2);
    });

    it('GET /api/notifications reflects queue_joined flow when user is registered', async () => {
        await registerUser('joiner@example.com');
        await seedServiceAndJoin('joiner@example.com');

        const res = await request(app).get('/api/notifications').query({ email: 'joiner@example.com' });
        expect(res.status).toBe(200);
        expect(res.body.notifications.length).toBeGreaterThan(0);
        expect(
            res.body.notifications.some((n) => n.type === 'queue_joined' || n.message.includes('joined'))
        ).toBe(true);
        expect(res.body.unreadCount).toBe(res.body.notifications.filter((n) => n.status === 'sent').length);
    });

    it('PATCH /api/notifications/:id/read marks the notification viewed in MongoDB', async () => {
        await registerUser('john@example.com');
        const user = await UserCredentials.findOne({ email: 'john@example.com' });
        const row = await Notification.create({
            userId: user._id,
            type: 'notice',
            message: 'hello',
            status: 'sent',
            timestamp: new Date()
        });

        const res = await request(app)
            .patch(`/api/notifications/${row._id}/read`)
            .query({ email: 'john@example.com' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/marked as read/i);
        expect(res.body.notification.status).toBe('viewed');

        const stored = await Notification.findById(row._id);
        expect(stored.status).toBe('viewed');
    });

    it('PATCH /api/notifications/:id/read returns 404 if the notification does not belong to that user', async () => {
        await registerUser('john@example.com');
        const user = await UserCredentials.findOne({ email: 'john@example.com' });
        const row = await Notification.create({
            userId: user._id,
            type: 'notice',
            message: 'private',
            status: 'sent',
            timestamp: new Date()
        });

        const res = await request(app)
            .patch(`/api/notifications/${row._id}/read`)
            .query({ email: 'other@example.com' });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/notification not found|access denied/i);
    });
});

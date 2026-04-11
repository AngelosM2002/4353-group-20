const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Service = require('../src/models/Service');
const { connectMongoMemory, disconnectMongoMemory, clearDatabase } = require('./mongoTestDb');

let mongoServer;

const validPayload = {
    name: 'General Consultation',
    description: 'Basic consultation',
    expectedDuration: 15,
    priorityLevel: 1
};

beforeAll(async () => {
    mongoServer = await connectMongoMemory();
});

afterAll(async () => {
    await disconnectMongoMemory(mongoServer);
});

beforeEach(async () => {
    await clearDatabase();
});

describe('Service API (MongoDB)', () => {
    describe('POST /api/services', () => {
        it('creates a service and persists it in MongoDB', async () => {
            const res = await request(app).post('/api/services').send(validPayload);

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('General Consultation');
            expect(res.body.expectedDuration).toBe(15);
            expect(res.body.priorityLevel).toBe(1);
            expect(res.body._id).toBeDefined();

            const stored = await Service.findById(res.body._id).lean();
            expect(stored).not.toBeNull();
            expect(stored.name).toBe('General Consultation');
        });

        it('returns 400 when name is missing', async () => {
            const res = await request(app).post('/api/services').send({
                description: 'x',
                expectedDuration: 10,
                priorityLevel: 1
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/name and duration/i);
        });

        it('returns 400 when expectedDuration is missing', async () => {
            const res = await request(app).post('/api/services').send({
                name: 'X',
                description: 'x',
                priorityLevel: 1
            });
            expect(res.status).toBe(400);
        });

        it('returns 400 when priorityLevel is missing or not numeric', async () => {
            const missing = await request(app).post('/api/services').send({
                name: 'X',
                description: 'x',
                expectedDuration: 10
            });
            expect(missing.status).toBe(400);
            expect(missing.body.message).toMatch(/priority/i);

            const invalid = await request(app).post('/api/services').send({
                name: 'X',
                description: 'x',
                expectedDuration: 10,
                priorityLevel: 'not-a-number'
            });
            expect(invalid.status).toBe(400);
        });
    });

    describe('GET /api/services', () => {
        it('returns persisted services', async () => {
            await request(app).post('/api/services').send({
                name: 'A',
                description: 'd',
                expectedDuration: 5,
                priorityLevel: 2
            });

            const res = await request(app).get('/api/services');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe('A');
            expect(await Service.countDocuments()).toBe(1);
        });
    });

    describe('PUT /api/services/:id', () => {
        it('updates an existing service and reflects in MongoDB', async () => {
            const created = await request(app).post('/api/services').send({
                name: 'Original',
                description: 'd',
                expectedDuration: 10,
                priorityLevel: 1
            });
            const id = created.body._id;

            const res = await request(app).put(`/api/services/${id}`).send({ expectedDuration: 25 });
            expect(res.status).toBe(200);
            expect(res.body.service.expectedDuration).toBe(25);

            const stored = await Service.findById(id).lean();
            expect(stored.expectedDuration).toBe(25);
        });

        it('returns 404 for a missing service', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app).put(`/api/services/${fakeId}`).send({ name: 'Ghost' });
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/services/:id', () => {
        it('removes a service from MongoDB', async () => {
            const created = await request(app).post('/api/services').send({
                name: 'ToDelete',
                description: 'd',
                expectedDuration: 5,
                priorityLevel: 1
            });
            const id = created.body._id;

            const res = await request(app).delete(`/api/services/${id}`);
            expect(res.status).toBe(200);
            expect(await Service.findById(id)).toBeNull();
        });

        it('returns 404 for a missing service', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app).delete(`/api/services/${fakeId}`);
            expect(res.status).toBe(404);
        });
    });
});

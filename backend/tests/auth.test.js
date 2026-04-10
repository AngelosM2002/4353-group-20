const request = require('supertest');
const app = require('../server');
const UserCredentials = require('../src/models/UserCredentials');
const UserProfile = require('../src/models/UserProfile');
const Service = require('../src/models/Service');
const { connectMongoMemory, disconnectMongoMemory, clearDatabase } = require('./mongoTestDb');

let mongoServer;

beforeAll(async () => {
    mongoServer = await connectMongoMemory();
});

beforeEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await disconnectMongoMemory(mongoServer);
});

describe('Authentication API Tests', () => {
    describe('POST /api/auth/register', () => {
        it('should successfully register a new user with valid data', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John Doe',
                    email: 'johndoe@example.com',
                    password: 'password123',
                    role: 'User'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'User registered successfully');
            expect(res.body.user.name).toEqual('John Doe');
            expect(res.body.user.email).toEqual('johndoe@example.com');

            const stored = await UserCredentials.findOne({ email: 'johndoe@example.com' });
            expect(stored.password).not.toEqual('password123');
            expect(stored.password.startsWith('$2b$')).toBe(true);
        });

        it('should fail if email is an invalid format', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Jane Doe',
                    email: 'invalid-email',
                    password: 'password123',
                    role: 'User'
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toMatch(/valid email is required/i);
        });

        it('should fail if password is too short', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Jane Doe',
                    email: 'janedoe@example.com',
                    password: '123',
                    role: 'User'
                });

            expect(res.statusCode).toEqual(400);
        });

        it('should fail if email is already registered', async () => {
            await request(app).post('/api/auth/register').send({
                name: 'John Doe',
                email: 'johndoe@example.com',
                password: 'password123',
                role: 'User'
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John Clone',
                    email: 'johndoe@example.com',
                    password: 'password456',
                    role: 'User'
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toMatch(/already exists/i);
        });

        it('should create both UserCredentials and UserProfile documents', async () => {
            await request(app).post('/api/auth/register').send({
                name: 'Profile Test',
                email: 'profile@example.com',
                password: 'password123',
                role: 'User'
            });

            const creds = await UserCredentials.findOne({ email: 'profile@example.com' });
            const profile = await UserProfile.findOne({ email: 'profile@example.com' });

            expect(creds).not.toBeNull();
            expect(profile).not.toBeNull();
            expect(profile.fullName).toEqual('Profile Test');
            expect(profile.userId.toString()).toEqual(creds._id.toString());
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await request(app).post('/api/auth/register').send({
                name: 'John Doe',
                email: 'johndoe@example.com',
                password: 'password123',
                role: 'User'
            });
        });

        it('should successfully login with correct credentials', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'johndoe@example.com',
                password: 'password123'
            });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'login successful');
            expect(res.body.user.email).toEqual('johndoe@example.com');
            expect(res.body.user.name).toEqual('John Doe');
        });

        it('should fail to login with an unknown email', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'unknown@example.com',
                password: 'password123'
            });

            expect(res.statusCode).toEqual(401);
        });

        it('should fail to login with wrong password', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'johndoe@example.com',
                password: 'wrongpassword'
            });

            expect(res.statusCode).toEqual(401);
            expect(res.body.message).toMatch(/invalid email or password/i);
        });

        it('should fail if email or password is missing', async () => {
            const res = await request(app).post('/api/auth/login').send({ email: 'johndoe@example.com' });

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('POST /api/auth/register role validation', () => {
        it('should accept Administrator role and persist lowercase in MongoDB', async () => {
            const res = await request(app).post('/api/auth/register').send({
                name: 'Admin User',
                email: 'adminuser@example.com',
                password: 'password123',
                role: 'Administrator'
            });

            expect(res.statusCode).toBe(201);
            expect(res.body.user.role).toBe('administrator');

            const stored = await UserCredentials.findOne({ email: 'adminuser@example.com' });
            expect(stored.role).toBe('administrator');
        });

        it('should reject invalid role values', async () => {
            const res = await request(app).post('/api/auth/register').send({
                name: 'Bad Role',
                email: 'badrole@example.com',
                password: 'password123',
                role: 'superuser'
            });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/role must be/i);
        });
    });

    describe('Queue admin role alignment (x-user-role vs registered role)', () => {
        it('allows x-user-role admin for GET /api/queues/admin/:serviceId', async () => {
            const svc = await Service.create({
                name: 'Desk',
                description: 'd',
                expectedDuration: 5,
                priorityLevel: 1,
                status: 'active'
            });

            const res = await request(app).get(`/api/queues/admin/${svc._id}`).set('x-user-role', 'admin');

            expect(res.statusCode).toBe(200);
        });

        it('rejects x-user-role administrator until requireAdmin matches UserCredentials enum', async () => {
            const svc = await Service.create({
                name: 'Desk',
                description: 'd',
                expectedDuration: 5,
                priorityLevel: 1,
                status: 'active'
            });

            const res = await request(app)
                .get(`/api/queues/admin/${svc._id}`)
                .set('x-user-role', 'administrator');

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/administrator access required/i);
        });
    });
});

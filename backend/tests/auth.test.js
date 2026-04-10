const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server'); // Import the Express app
const UserCredentials = require('../src/models/UserCredentials');
const UserProfile = require('../src/models/UserProfile');

let mongoServer;

// spin up an in-memory MongoDB instance for testing
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

// clean up collections between tests
beforeEach(async () => {
    await UserCredentials.deleteMany({});
    await UserProfile.deleteMany({});
});

// disconnect and stop the in-memory server after all tests
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
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

            // verify password is stored as a hash, not plain text
            const stored = await UserCredentials.findOne({ email: 'johndoe@example.com' });
            expect(stored.password).not.toEqual('password123');
            expect(stored.password.startsWith('$2b$')).toBe(true); // bcrypt hash prefix
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
                    password: '123', // Too short
                    role: 'User'
                });
            
            expect(res.statusCode).toEqual(400);
        });

        it('should fail if email is already registered', async () => {
            // register the first user
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John Doe',
                    email: 'johndoe@example.com',
                    password: 'password123',
                    role: 'User'
                });

            // try to register with the same email
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
            await request(app)
                .post('/api/auth/register')
                .send({
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
        // helper: register a user before login tests
        beforeEach(async () => {
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John Doe',
                    email: 'johndoe@example.com',
                    password: 'password123',
                    role: 'User'
                });
        });

        it('should successfully login with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'johndoe@example.com',
                    password: 'password123'
                });
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'login successful');
            expect(res.body.user.email).toEqual('johndoe@example.com');
            expect(res.body.user.name).toEqual('John Doe');
        });

        it('should fail to login with an unknown email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'unknown@example.com',
                    password: 'password123'
                });
            
            expect(res.statusCode).toEqual(401);
        });

        it('should fail to login with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'johndoe@example.com',
                    password: 'wrongpassword'
                });
            
            expect(res.statusCode).toEqual(401);
            expect(res.body.message).toMatch(/invalid email or password/i);
        });

        it('should fail if email or password is missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'johndoe@example.com' });
            
            expect(res.statusCode).toEqual(400);
        });
    });
});

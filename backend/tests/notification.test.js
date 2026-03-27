const request = require('supertest');
const app = require('../server');
const {
  services,
  queues,
  queueArrivalSeq,
  notifications,
  nearServeNotified
} = require('../src/data/memoryData');

describe('Notification API Tests', () => {
  beforeEach(() => {
    services.length = 0;
    notifications.length = 0;
    nearServeNotified.clear();

    Object.keys(queues).forEach((k) => delete queues[k]);
    Object.keys(queueArrivalSeq).forEach((k) => delete queueArrivalSeq[k]);

    services.push({
      id: 1,
      name: 'Test Service',
      expectedDuration: 10,
      priorityLevel: 1
    });
  });

  it('should create a queue_joined notification when a user joins a queue', async () => {
    const res = await request(app)
      .post('/api/queues/join')
      .send({
        serviceId: '1',
        userName: 'John Doe',
        userEmail: 'john@example.com'
      });

    expect(res.status).toBe(201);
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications.some((n) => n.type === 'queue_joined')).toBe(true);
  });

  it('should return notifications for a user', async () => {
    await request(app)
      .post('/api/queues/join')
      .send({
        serviceId: '1',
        userName: 'John Doe',
        userEmail: 'john@example.com'
      });

    const res = await request(app)
      .get('/api/notifications')
      .query({ email: 'john@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('notifications');
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.notifications.length).toBeGreaterThan(0);
  });

  it('should mark a notification as read', async () => {
    await request(app)
      .post('/api/queues/join')
      .send({
        serviceId: '1',
        userName: 'John Doe',
        userEmail: 'john@example.com'
      });

    const userNotifications = notifications.filter(
      (n) => n.userEmail === 'john@example.com'
    );

    const notificationId = userNotifications[0].id;

    const res = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .query({ email: 'john@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Marked as read');
    expect(res.body.notification.read).toBe(true);
  });

  it('should return 400 if email query parameter is missing', async () => {
    const res = await request(app).get('/api/notifications');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('email query parameter is required');
  });
});
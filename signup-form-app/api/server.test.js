/**
 * Integration tests for the Express server.
 *
 * The signupService is mocked, and SUBMIT_DELAY_MS is set to 0 so the
 * 5-second sleep doesn't slow down the test run.
 */

process.env.SUBMIT_DELAY_MS = '0';

jest.mock('./services/signupService', () => ({
  ALLOWED_CATEGORIES: ['Colors', 'Football Teams', 'Colleges'],
  validateSignupInput: jest.fn(),
  createSignup: jest.fn(),
  getAllSignups: jest.fn(),
  getSignupsByCategory: jest.fn(),
}));

const request = require('supertest');
const app = require('./server');
const service = require('./services/signupService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/health', () => {
  test('responds with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('GET /api/signups', () => {
  test('returns the list from the service', async () => {
    service.getAllSignups.mockResolvedValue([
      { id: '1', name: 'Jane', email: 'j@x.com', category: 'Colors' },
    ]);
    const res = await request(app).get('/api/signups');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(service.getAllSignups).toHaveBeenCalledTimes(1);
  });

  test('passes service errors through to the error handler', async () => {
    service.getAllSignups.mockRejectedValue(new Error('boom'));
    const res = await request(app).get('/api/signups');
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'boom' });
  });
});

describe('GET /api/signups/category/:category', () => {
  test('returns filtered items', async () => {
    service.getSignupsByCategory.mockResolvedValue([
      { id: '2', category: 'Colors' },
    ]);
    const res = await request(app).get('/api/signups/category/Colors');
    expect(res.status).toBe(200);
    expect(service.getSignupsByCategory).toHaveBeenCalledWith('Colors');
    expect(res.body[0]).toMatchObject({ category: 'Colors' });
  });

  test('400 propagates from the service', async () => {
    const err = new Error('Unknown category');
    err.statusCode = 400;
    service.getSignupsByCategory.mockRejectedValue(err);
    const res = await request(app).get('/api/signups/category/Bogus');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'Unknown category' });
  });
});

describe('POST /api/signups', () => {
  test('creates a sign-up and returns 201', async () => {
    service.createSignup.mockResolvedValue({
      id: 'abc',
      name: 'Jane',
      email: 'jane@example.com',
      phone: '5551234567',
      category: 'Colors',
      createdAt: new Date().toISOString(),
    });
    const res = await request(app)
      .post('/api/signups')
      .send({
        name: 'Jane',
        email: 'jane@example.com',
        phone: '5551234567',
        category: 'Colors',
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'abc', name: 'Jane' });
    expect(service.createSignup).toHaveBeenCalledTimes(1);
  });

  test('returns 400 with field errors on validation failure', async () => {
    const err = new Error('Validation failed');
    err.statusCode = 400;
    err.fields = { email: 'A valid email is required.' };
    service.createSignup.mockRejectedValue(err);
    const res = await request(app)
      .post('/api/signups')
      .send({ name: 'Jane', email: 'bad', phone: '5551234567', category: 'Colors' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'Validation failed',
      fields: { email: expect.any(String) },
    });
  });
});

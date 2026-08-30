const request = require('supertest');
const express = require('express');

// Mock db module
jest.mock('../src/db', () => ({
  pool: {
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
    end: jest.fn().mockResolvedValue(),
  },
  checkConnection: jest.fn(),
  initializeDatabase: jest.fn().mockResolvedValue(),
}));

const db = require('../src/db');
const healthRoutes = require('../src/routes/health');

const app = express();
app.use(express.json());
app.use('/api/health', healthRoutes);

describe('Health Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/health returns 200 and status UP', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'UP');
    expect(res.body).toHaveProperty('service', 'backend-api');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.body).toHaveProperty('memoryUsage');
  });

  it('GET /api/health/live returns 200 and status LIVE', async () => {
    const res = await request(app).get('/api/health/live');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'LIVE');
  });

  it('GET /api/health/ready returns 200 when DB is connected', async () => {
    db.checkConnection.mockResolvedValueOnce({
      connected: true,
      latencyMs: 3,
    });

    const res = await request(app).get('/api/health/ready');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'READY');
    expect(res.body).toHaveProperty('database', 'CONNECTED');
    expect(res.body.latencyMs).toBe(3);
  });

  it('GET /api/health/ready returns 503 when DB is disconnected', async () => {
    db.checkConnection.mockResolvedValueOnce({
      connected: false,
      latencyMs: 15,
      error: 'Connection refused',
    });

    const res = await request(app).get('/api/health/ready');
    expect(res.statusCode).toEqual(503);
    expect(res.body).toHaveProperty('status', 'NOT_READY');
    expect(res.body).toHaveProperty('database', 'DISCONNECTED');
  });

  it('GET /api/health/db returns 200 with pool stats when DB is healthy', async () => {
    db.checkConnection.mockResolvedValueOnce({
      connected: true,
      databaseName: 'devops_db',
      currentTime: '2026-08-30T00:00:00.000Z',
      version: 'PostgreSQL 16.0',
      latencyMs: 2,
    });

    const res = await request(app).get('/api/health/db');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'HEALTHY');
    expect(res.body).toHaveProperty('database', 'devops_db');
    expect(res.body).toHaveProperty('connectionPool');
    expect(res.body.connectionPool).toHaveProperty('totalCount', 5);
  });

  it('GET /api/health/db returns 500 when DB is unhealthy', async () => {
    db.checkConnection.mockResolvedValueOnce({
      connected: false,
      error: 'Query timeout',
      latencyMs: 5000,
    });

    const res = await request(app).get('/api/health/db');
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty('status', 'UNHEALTHY');
    expect(res.body).toHaveProperty('error', 'Query timeout');
  });
});

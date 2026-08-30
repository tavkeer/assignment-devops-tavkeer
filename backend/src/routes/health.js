const express = require('express');
const router = express.Router();
const db = require('../db');

// Liveness probe - returns 200 if the process is up
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'backend-api',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    memoryUsage: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    },
  });
});

// Liveness probe alias for k8s / alb
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'LIVE', timestamp: new Date().toISOString() });
});

// Readiness probe - checks if backend + database are ready
router.get('/ready', async (req, res) => {
  const dbStatus = await db.checkConnection();
  if (dbStatus.connected) {
    return res.status(200).json({
      status: 'READY',
      database: 'CONNECTED',
      latencyMs: dbStatus.latencyMs,
      timestamp: new Date().toISOString(),
    });
  } else {
    return res.status(503).json({
      status: 'NOT_READY',
      database: 'DISCONNECTED',
      error: dbStatus.error,
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed Database Health & Metrics
router.get('/db', async (req, res) => {
  const dbStatus = await db.checkConnection();
  if (dbStatus.connected) {
    return res.status(200).json({
      status: 'HEALTHY',
      database: dbStatus.databaseName,
      serverTime: dbStatus.currentTime,
      version: dbStatus.version,
      queryLatencyMs: dbStatus.latencyMs,
      connectionPool: {
        totalCount: db.pool.totalCount,
        idleCount: db.pool.idleCount,
        waitingCount: db.pool.waitingCount,
      },
    });
  } else {
    return res.status(500).json({
      status: 'UNHEALTHY',
      error: dbStatus.error,
      latencyMs: dbStatus.latencyMs,
    });
  }
});

module.exports = router;

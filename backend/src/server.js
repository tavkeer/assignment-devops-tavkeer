const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('./logger');
const db = require('./db');
const metrics = require('./metrics');
const healthRoutes = require('./routes/health');
const tasksRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5000;

// Metrics Middleware (placed before others to accurately measure latency)
app.use(metrics.metricsMiddleware);

// Security & Parsing Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Metrics Endpoint (Scraped by Prometheus / Monitoring agents)
app.get('/metrics', metrics.metricsHandler);

// Mount API Routes
app.use('/api/health', healthRoutes);
app.use('/api/tasks', tasksRoutes);

// Root information endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'DevOps Full-Stack API',
    version: '1.0.0',
    status: 'Running',
    docs: {
      health: '/api/health',
      health_db: '/api/health/db',
      metrics: '/metrics',
      tasks: '/api/tasks',
      task_stats: '/api/tasks/stats/summary',
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled server error', {
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// Start Server & Connect DB (only when not running under test suite)
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, async () => {
    logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    await db.initializeDatabase();
  });
}

// Graceful Shutdown
const handleShutdown = async (signal) => {
  logger.info(`Received ${signal}. Gracefully shutting down...`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await db.pool.end();
        logger.info('Database pool drained.');
        process.exit(0);
      } catch (err) {
        logger.error('Error while draining database pool', { error: err.message });
        process.exit(1);
      }
    });
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = app;

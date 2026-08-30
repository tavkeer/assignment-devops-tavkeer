const client = require('prom-client');

// Initialize Prometheus registry
const register = new client.Registry();

// Add default recommended labels
register.setDefaultLabels({
  app: 'devops-assignment-api',
});

// Enable collection of default runtime metrics   (Memory, CPU, Event loop, GC)
client.collectDefaultMetrics({ register });

// Custom RED Metrics: Rate, Errors, Duration
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const httpActiveRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests currently being processed',
  registers: [register],
});

const dbQueryDurationSeconds = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'PostgreSQL database query execution duration in seconds',
  labelNames: ['operation', 'status'],
  buckets: [0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register],
});

const dbErrorsTotal = new client.Counter({
  name: 'database_errors_total',
  help: 'Total number of database errors encountered',
  labelNames: ['operation'],
  registers: [register],
});

/**
 * Normalizes URL path to prevent metric cardinality explosion.
 * E.g. /api/tasks/42 -> /api/tasks/:id
 */
function normalizeRoute(req) {
  if (req.baseUrl && req.route) {
    return `${req.baseUrl}${req.route.path === '/' ? '' : req.route.path}`;
  }
  const path = req.path || req.url;
  return path
    .replace(/\/tasks\/\d+/g, '/tasks/:id')
    .replace(/\/tasks\/[a-f0-9-]{36}/g, '/tasks/:id') || '/';
}

/**
 * Express middleware to record HTTP metrics
 */
function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') {
    return next();
  }

  httpActiveRequests.inc();
  const start = process.hrtime();

  res.on('finish', () => {
    httpActiveRequests.dec();

    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    const route = normalizeRoute(req);
    const statusCode = res.statusCode ? res.statusCode.toString() : '500';

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      durationInSeconds
    );
  });

  next();
}

/**
 * Route handler for /metrics endpoint
 */
async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
}

module.exports = {
  register,
  client,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpActiveRequests,
  dbQueryDurationSeconds,
  dbErrorsTotal,
  metricsMiddleware,
  metricsHandler,
  normalizeRoute,
};


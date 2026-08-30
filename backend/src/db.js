const { Pool } = require('pg');
const logger = require('./logger');

const isCloudDb = Boolean(
  process.env.DB_HOST &&
  process.env.DB_HOST !== 'localhost' &&
  process.env.DB_HOST !== 'postgres' &&
  process.env.DB_HOST !== '127.0.0.1'
);

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'devops_db',
  user: process.env.DB_USER || 'devops_user',
  password: process.env.DB_PASSWORD || 'devops_secure_password_2026',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

if (isCloudDb) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message, stack: err.stack });
});

// Helper function to query database
const query = (text, params) => pool.query(text, params);

// Database connection check and schema initialization
const checkConnection = async () => {
  const start = Date.now();
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name, version() as version');
    const duration = Date.now() - start;
    return {
      connected: true,
      latencyMs: duration,
      currentTime: res.rows[0].current_time,
      databaseName: res.rows[0].db_name,
      version: res.rows[0].version,
    };
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('PostgreSQL connection check failed', { error: error.message, latencyMs: duration });
    return {
      connected: false,
      latencyMs: duration,
      error: error.message,
    };
  }
};

// Ensure tables exist on boot
const initializeDatabase = async (retries = 5, delayMs = 3000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      logger.info(`Attempting to connect to PostgreSQL (attempt ${i}/${retries})...`, {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        database: process.env.DB_NAME || 'devops_db',
      });

      const client = await pool.connect();
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(50) DEFAULT 'DevOps',
          status VARCHAR(50) DEFAULT 'Pending',
          priority VARCHAR(20) DEFAULT 'Medium',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS system_logs (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Check if sample tasks exist, if not seed them
      const countRes = await client.query('SELECT COUNT(*) FROM tasks');
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO tasks (title, description, category, status, priority)
          VALUES 
            ('Dockerize Multi-Tier App', 'Configure Dockerfiles and Docker Compose for Frontend, Backend, and Database.', 'Docker', 'Completed', 'High'),
            ('Set up PostgreSQL Database', 'Initialize relational database tables, relations, and seed scripts.', 'Database', 'Completed', 'High'),
            ('Implement Health Probes', 'Add /api/health and /api/health/db endpoints for container and load balancer health checks.', 'Backend', 'Completed', 'High'),
            ('Create Dashboard UI', 'Build responsive single-page dashboard with Tailwind CSS and live latency monitors.', 'Frontend', 'Completed', 'Medium'),
            ('Configure Production Nginx', 'Set up reverse proxy routing and caching in multi-stage Docker build.', 'DevOps', 'Pending', 'Medium'),
            ('Terraform Cloud Provisioning', 'Provision VPC, ECS, RDS, ALB, and Security Groups on AWS.', 'Infrastructure', 'Pending', 'High'),
            ('CI/CD Pipeline Setup', 'Automate testing, container security scanning, and deployment via GitHub Actions.', 'CI/CD', 'Pending', 'High');
        `);
      }

      client.release();
      logger.info('Database connection established and verified successfully.');
      return;
    } catch (err) {
      logger.warn(`Database connection attempt ${i} failed: ${err.message}. Retrying in ${delayMs / 1000}s...`);
      if (i === retries) {
        logger.error('Could not initialize database connection after multiple retries.', { error: err.message });
      } else {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
};

module.exports = {
  pool,
  query,
  checkConnection,
  initializeDatabase,
};

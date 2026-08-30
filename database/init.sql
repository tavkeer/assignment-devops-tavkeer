-- Create schema and tables for DevOps Task & Service Tracker

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

-- Seed initial tasks
INSERT INTO tasks (title, description, category, status, priority)
VALUES 
    ('Dockerize Multi-Tier App', 'Configure Dockerfiles and Docker Compose for Frontend, Backend, and Database.', 'Docker', 'Completed', 'High'),
    ('Set up PostgreSQL Database', 'Initialize relational database tables, relations, and seed scripts.', 'Database', 'Completed', 'High'),
    ('Implement Health Probes', 'Add /api/health and /api/health/db endpoints for container and load balancer health checks.', 'Backend', 'Completed', 'High'),
    ('Create Dashboard UI', 'Build responsive single-page dashboard with Tailwind CSS and live latency monitors.', 'Frontend', 'Completed', 'Medium'),
    ('Configure Production Nginx', 'Set up reverse proxy routing and caching in multi-stage Docker build.', 'DevOps', 'Pending', 'Medium'),
    ('Terraform Cloud Provisioning', 'Provision VPC, ECS, RDS, ALB, and Security Groups on AWS.', 'Infrastructure', 'Pending', 'High'),
    ('CI/CD Pipeline Setup', 'Automate testing, container security scanning, and deployment via GitHub Actions.', 'CI/CD', 'Pending', 'High')
ON CONFLICT DO NOTHING;

-- Seed initial system log
INSERT INTO system_logs (event_type, message)
VALUES 
    ('DATABASE_INITIALIZED', 'PostgreSQL database initialized successfully with initial schemas and sample data.')
ON CONFLICT DO NOTHING;

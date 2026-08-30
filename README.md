# Production DevOps Platform: 3-Tier Application & Automated Infrastructure

[![CI Pull Request Verification](https://img.shields.io/badge/CI-GitHub%20Actions-blue.svg)](.github/workflows/ci-pr.yml)
[![CD Multi-Environment Deploy](https://img.shields.io/badge/CD-ECS%20Fargate-green.svg)](.github/workflows/cd-pipeline.yml)
[![Infrastructure](https://img.shields.io/badge/IaC-Terraform-blueviolet.svg)](terraform/)
[![Security Scan](https://img.shields.io/badge/Security-Trivy%20%26%20Zero%20CVEs-brightgreen.svg)](#security-considerations)
[![Observability](https://img.shields.io/badge/Monitoring-Prometheus%20%2B%20Grafana-orange.svg)](monitoring/)

An enterprise-grade, 3-tier containerized production web application with fully automated Infrastructure as Code (Terraform on AWS), end-to-end CI/CD pipelines (GitHub Actions), vulnerability scanning (Trivy), Prometheus & Grafana observability, structured logging, and AWS Secrets Manager integration.

---

## 🏗️ Architecture Overview

```
                                  ┌───────────────────────────────┐
                                  │      Client Browser / DNS     │
                                  └───────────────┬───────────────┘
                                                  │ (Port 80 / 443)
                                                  ▼
     ┌─────────────────────────────────────────────────────────────────────────────────────────┐
     │  AWS Virtual Private Cloud (Multi-AZ 10.0.0.0/16)                                        │
     │                                                                                         │
     │   PUBLIC SUBNETS (AZ-1 & AZ-2)                                                          │
     │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
     │   │  Application Load Balancer (ALB)                                                │   │
     │   │  - Path `/` ──────► Frontend Target Group (Port 80)                             │   │
     │   │  - Path `/api/*` ──► Backend Target Group (Port 5000)                            │   │
     │   │  - Path `/metrics` ─► Prometheus Metrics Target Group                            │   │
     │   │  NAT Gateways (Outbound Internet for Private Subnets)                           │   │
     │   └────────────────────────────────────────┬────────────────────────────────────────┘   │
     │                                            │                                            │
     │   PRIVATE APPLICATION SUBNETS (AZ-1 & AZ-2)│ (Isolated - No Public IPs)                 │
     │   ┌────────────────────────────────────────▼────────────────────────────────────────┐   │
     │   │  AWS ECS Fargate Cluster                                                        │   │
     │   │  ┌───────────────────────────────┐     ┌──────────────────────────────────────┐ │   │
     │   │  │ Frontend Tasks (Nginx React)  │     │ Backend Tasks (Node.js 20 Express)   │ │   │
     │   │  │ - Reverse Proxy `/api/*`      │     │ - Task CRUD & Summary Stats          │ │   │
     │   │  │ - Health Probe `/healthz`     │     │ - Liveness & Readiness Probes        │ │   │
     │   │  └───────────────────────────────┘     │ - Prometheus Exporter (`/metrics`)   │ │   │
     │   │                                        └──────────────────┬───────────────────┘ │   │
     │   └───────────────────────────────────────────────────────────┼─────────────────────┘   │
     │                                                               │ (Port 5432)             │
     │   PRIVATE DATABASE SUBNETS (AZ-1 & AZ-2)                      │ (Strictly Air-Gapped)   │
     │   ┌───────────────────────────────────────────────────────────▼─────────────────────┐   │
     │   │  Amazon RDS PostgreSQL 16                                                       │   │
     │   │  - Automated Daily Backups & Point-In-Time Recovery (PITR)                      │   │
     │   │  - KMS Encrypted `gp3` Storage with Automatic Storage Scaling                   │   │
     │   └─────────────────────────────────────────────────────────────────────────────────┘   │
     │                                                                                         │
     │   MANAGEMENT & TELEMETRY                                                                │
     │   - AWS Secrets Manager: Dynamic DB Password & Secret Injection                         │
     │   - AWS CloudWatch: Centralized Logs (`/ecs/frontend`, `/ecs/backend`) & Dashboards     │
     │   - Amazon ECR: Image Registries with automated scan-on-push & lifecycle rules          │
     └─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Table of Contents
1. [Part 1: Infrastructure Provisioning (Terraform)](#part-1-infrastructure-provisioning-terraform)
2. [Part 2: CI/CD Deployment Automation](#part-2-cicd-deployment-automation)
3. [Part 3: Monitoring, Logging & Dashboards](#part-3-monitoring-logging--dashboards)
4. [Part 4: Security, Secrets & Backup Strategy](#part-4-security-secrets--backup-strategy)
5. [Local Quick Start (Docker Compose)](#local-quick-start-docker-compose)
6. [Deliverables & Documentation Links](#deliverables--documentation-links)

---

## Part 1: Infrastructure Provisioning (Terraform)

The infrastructure is written in modular, reusable Terraform under [`terraform/`](terraform/).

### Module Breakdown
- **[`modules/vpc`](terraform/modules/vpc/)**: Multi-AZ VPC across 2 Availability Zones, containing 2 Public Subnets, 2 Private Application Subnets, 2 Private Database Subnets, Internet Gateway, and NAT Gateway.
- **[`modules/security`](terraform/modules/security/)**: Chained least-privilege security groups (ALB `80/443` $\to$ ECS Tasks `80/5000` $\to$ RDS `5432`).
- **[`modules/secrets`](terraform/modules/secrets/)**: AWS Secrets Manager secret for PostgreSQL credentials with auto-generated secure passwords.
- **[`modules/rds`](terraform/modules/rds/)**: Managed PostgreSQL 16 database in private subnets with storage encryption and custom parameter groups.
- **[`modules/ecr`](terraform/modules/ecr/)**: Amazon ECR registries for Frontend and Backend images with vulnerability scan-on-push and lifecycle rules (expires untagged images older than 7 days).
- **[`modules/alb`](terraform/modules/alb/)**: Application Load Balancer with health check target groups and path routing rules.
- **[`modules/ecs`](terraform/modules/ecs/)**: Serverless ECS Fargate cluster with Container Insights, IAM roles, CloudWatch log streams, and `ignore_changes = [task_definition]` for smooth CI/CD rollouts.
- **[`modules/monitoring`](terraform/modules/monitoring/)**: Native CloudWatch Dashboard with real-time ALB latency, ECS CPU/Memory, and RDS utilization widgets.

### How to Deploy with Terraform
1. **Initialize Terraform & Modules**:
   ```bash
   cd terraform
   terraform init
   ```
2. **Preview Changes (Staging)**:
   ```bash
   terraform plan -var-file=environments/staging.tfvars
   ```
3. **Provision Infrastructure**:
   ```bash
   terraform apply -var-file=environments/staging.tfvars
   ```
4. **State Management**: Remote state locking via Amazon S3 and DynamoDB is preconfigured in [`terraform/backend.tf`](terraform/backend.tf).

---

## Part 2: CI/CD Deployment Automation

CI/CD automation is built using GitHub Actions in [`.github/workflows/`](.github/workflows/):

### Workflow 1: Pull Request Verification (`ci-pr.yml`)
- **Trigger**: Every pull request targeting `main`.
- **Steps**:
  1. **Backend Quality Gate**: Runs unit & integration test suite (22 tests passing) + `npm audit --audit-level=high`.
  2. **Frontend Quality Gate**: Runs Vite production build verification + `npm audit`.
  3. **Security Analysis**: Scans filesystem and repository secrets using **Trivy** (`aquasecurity/trivy-action`).
  4. **PR Summary & Notification**: Publishes markdown test summary to `$GITHUB_STEP_SUMMARY` and triggers webhook/Slack alert on failure.

### Workflow 2: Continuous Delivery & Multi-Environment Deployment (`cd-pipeline.yml`)
- **Trigger**: Merge/push to `main` branch.
- **Steps**:
  1. **Pre-Deployment Verification**: Runs full test suite before any Docker builds.
  2. **Multi-Stage Container Build**: Builds Frontend and Backend Docker images.
  3. **Container Vulnerability Scan**: Executes **Trivy** container image vulnerability scans on both images before pushing.
  4. **ECR Registry Push**: Pushes tagged images (`sha-<commit-hash>` and `latest`) to Amazon ECR.
  5. **Auto-Deploy to Staging**: Updates ECS Fargate Staging service with rolling zero-downtime deployment and runs automated smoke test against the live ALB endpoint.
  6. **🔒 Manual Approval Gate for Production**: Uses GitHub Environments protection rules to hold production deployment until an authorized reviewer approves.
  7. **Deploy to Production**: Performs rolling zero-downtime deployment to Production ECS cluster.
  8. **Failure Notification**: Sends instant Slack/email webhook alert if any stage fails.

---

## Part 3: Monitoring, Logging & Dashboards

### 1. Application Metrics (RED Method)
The Express backend is instrumented with `prom-client` in [`backend/src/metrics.js`](backend/src/metrics.js) and exposes `/metrics`:
- **Rate**: `http_requests_total` by HTTP method, route, and status code.
- **Errors**: Ratio of 5xx errors to total HTTP requests.
- **Duration**: `http_request_duration_seconds` ($p50$, $p95$, $p99$ response latency).
- **Database Telemetry**: `database_query_duration_seconds` and `database_errors_total`.
- **Runtime Metrics**: Node.js heap memory, resident set size (RSS), event loop lag, and CPU usage.

### 2. Centralized Logging
- **Application Logs**: Structured JSON logging via Winston with log levels, timestamps, request paths, and query timings.
- **AWS CloudWatch Log Streams**: Forwarded via ECS `awslogs` log driver to `/ecs/staging-devops-assignment-backend` and `/ecs/staging-devops-assignment-frontend`.

### 3. Monitoring Dashboards
Two production-ready dashboards are included in [`monitoring/dashboards/`](monitoring/dashboards/):
1. **Application Performance & RED Metrics Dashboard** (`application-performance-dashboard.json`): Real-time RPS, Latency percentiles ($p50/p95/p99$), HTTP 5xx error ratios, and Node.js process memory.
2. **Infrastructure & Database Performance Dashboard** (`infrastructure-database-dashboard.json`): Database query latency, DB errors, CPU utilization, and Event Loop Lag.
3. **AWS CloudWatch Native Dashboard**: Automatically provisioned by Terraform in [`terraform/modules/monitoring/`](terraform/modules/monitoring/).

---

## Part 4: Security, Secrets & Backup Strategy

### 1. Secret Management
- Database credentials are created and managed via **AWS Secrets Manager** (`staging/devops-assignment/database`).
- Credentials are generated dynamically with cryptographic randomness using Terraform's `random_password` provider.
- ECS Task Execution IAM roles are granted read-only access to specific secret ARNs, injecting passwords into containers without exposing them in plaintext or code.

### 2. Backup & Disaster Recovery Strategy
- **Automated RDS Snapshots**: Configured with daily automated backups and retention policies (1 day in staging, 30 days in production).
- **Point-in-Time Recovery (PITR)**: Enables restoration of the database to any second within the retention window.
- **Storage Autoscaling**: RDS automatically scales storage from 20 GB up to 100 GB without downtime.

### 3. Cost Optimization Measures
- **Single NAT Gateway for Staging**: Configurable via `single_nat_gateway = true` to save ~$32/month per extra AZ.
- **ECS Fargate Spot**: Non-production environments utilize `FARGATE_SPOT` capacity providers, reducing compute costs by up to 70%.
- **ECR Lifecycle Rules**: Automatically purges untagged images older than 7 days and limits tagged images to the last 30 releases.
- **CloudWatch Log Retention**: Log groups enforce explicit retention periods (7 days staging / 30 days prod) to eliminate indefinite storage costs.

---

## 💻 Local Quick Start (Docker Compose)

You can run the entire multi-tier application stack plus local Prometheus & Grafana monitoring with a single command:

```bash
# 1. Start App Stack (Frontend + Backend + PostgreSQL)
docker compose up --build -d

# 2. (Optional) Start Prometheus + Grafana Observability Stack
docker compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d
```

### Access Endpoints
| Component | Local URL | Description |
|---|---|---|
| **Frontend Dashboard** | [http://localhost:3000](http://localhost:3000) | React SPA with Live Latency & Task Tracker |
| **Backend API Info** | [http://localhost:5001](http://localhost:5001) | Express REST API Root |
| **Liveness Probe** | [http://localhost:5001/api/health](http://localhost:5001/api/health) | Process Uptime & Memory |
| **Readiness Probe** | [http://localhost:5001/api/health/ready](http://localhost:5001/api/health/ready) | DB Connectivity Validation |
| **Database Status** | [http://localhost:5001/api/health/db](http://localhost:5001/api/health/db) | Connection Pool Stats & Latency |
| **Prometheus Metrics** | [http://localhost:5001/metrics](http://localhost:5001/metrics) | Scrape Endpoint for RED Metrics |
| **Prometheus UI** | [http://localhost:9090](http://localhost:9090) | Prometheus Time-Series Console |
| **Grafana Dashboards** | [http://localhost:3001](http://localhost:3001) | Grafana (user: `admin`, pass: `admin`) |

---

## 📑 Deliverables & Documentation Links

- **Approach & Architectural Decisions**: [`docs/APPROACH.md`](docs/APPROACH.md)
- **Challenges Faced & Resolutions**: [`docs/CHALLENGES.md`](docs/CHALLENGES.md)
- **Terraform Infrastructure Modules**: [`terraform/`](terraform/)
- **GitHub Actions CI/CD Workflows**: [`.github/workflows/`](.github/workflows/)
- **Prometheus & Grafana Configurations**: [`monitoring/`](monitoring/)

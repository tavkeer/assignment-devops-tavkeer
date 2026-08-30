# DevOps Assignment: Challenges Faced & Technical Resolutions

During the design, provisioning, and automation of this 3-tier production platform, several real-world DevOps engineering challenges were identified and resolved:

---

## Challenge 1: The Infrastructure vs. Container Deployment "Chicken-and-Egg" Problem

### The Challenge
When provisioning AWS ECS with Terraform for the first time, ECS task definitions and services require container image URIs before any task can start. However, the application Docker images had not yet been built or pushed to the private Amazon ECR repositories. Pointing directly to nonexistent image tags would cause Terraform apply to fail or get stuck waiting for service stability.

### Technical Resolution
1. **Bootstrap Image Defaults**: Configured Terraform task definitions to use lightweight, valid bootstrap image references (`public.ecr.aws/docker/library/node:20-alpine` and `public.ecr.aws/nginx/nginx:alpine`).
2. **Terraform Lifecycle Rules**: Added `lifecycle { ignore_changes = [task_definition] }` to both `aws_ecs_service` resources.
3. **Decoupled CI/CD**: When the GitHub Actions pipeline runs, it builds the actual code, tags the images with Git SHA (`sha-xyz`), pushes to ECR, and registers new task definition revisions without Terraform overwriting them on subsequent infrastructure runs.

---

## Challenge 2: AWS Free Tier RDS Backup Retention Constraints

### The Challenge
During initial RDS provisioning on AWS Free Tier accounts, the `aws_db_instance` resource failed with:
```text
FreeTierRestrictionError: The specified backup retention period exceeds the maximum available to free tier customers.
```
Default AWS Free Tier accounts enforce a maximum automated backup retention period of **1 day** (or `0` to disable), while standard enterprise defaults are typically 7 to 30 days.

### Technical Resolution
* Parameterized `backup_retention_period` across the RDS module and environment configuration files:
  * Staging / Free Tier: Set `backup_retention_period = 1` in [`environments/staging.tfvars`](file:///Users/tavkeershah/developement/devops/assignment-devops-tavkeer/terraform/environments/staging.tfvars).
  * Production: Maintained `backup_retention_period = 30` in [`environments/production.tfvars`](file:///Users/tavkeershah/developement/devops/assignment-devops-tavkeer/terraform/environments/production.tfvars).
* This allowed smooth deployment on AWS Free Tier without sacrificing production backup compliance.

---

## Challenge 3: Metric Cardinality Explosion in Express Prometheus Exporter

### The Challenge
When instrumenting the Express REST API with Prometheus RED metrics, routes with URL parameters (such as `GET /api/tasks/123` or `DELETE /api/tasks/456`) would generate unique Prometheus label values for every entity ID. In production with thousands of tasks, this leads to **metric cardinality explosion**, drastically increasing Prometheus memory usage and query latency.

### Technical Resolution
* Built a custom route normalizer `normalizeRoute(req)` in [`backend/src/metrics.js`](file:///Users/tavkeershah/developement/devops/assignment-devops-tavkeer/backend/src/metrics.js):
  * Collapses dynamic numeric and UUID identifiers into parameterized route signatures (e.g. `/api/tasks/:id`).
  * Bounded metric cardinality to a constant set of static route labels regardless of database size.

---

## Challenge 4: Security Hardening & Zero-Vulnerability Dependency Governance

### The Challenge
Standard Node.js base images and initial frontend dependencies triggered `npm audit` warnings and potential container CVEs during vulnerability scanning.

### Technical Resolution
1. **Multi-Stage Non-Root Containers**: Configured backend [`backend/Dockerfile`](file:///Users/tavkeershah/developement/devops/assignment-devops-tavkeer/backend/Dockerfile) with a non-root `USER node` and minimal Alpine base image (`node:20-alpine`).
2. **Dependency Resolution Overrides**: Upgraded Vite to `^6.2.0` and added explicit dependency resolution overrides for `esbuild` in `frontend/package.json`.
3. **CI/CD Quality Gating**: Added automated **Trivy** container and repository scans in GitHub Actions to catch and block vulnerabilities before deployment. Both frontend and backend now report **0 vulnerabilities**.

---

## Challenge 5: Least-Privilege Network Isolation Across Multi-Tier Components

### The Challenge
Exposing database or internal service ports inadvertently in public or shared security groups violates least-privilege compliance.

### Technical Resolution
* Chained security groups strictly by source security group ID rather than CIDR blocks:
  * **ALB SG**: Ingress `80/443` from `0.0.0.0/0`.
  * **ECS SG**: Ingress `80` (Frontend) and `5000` (Backend) allowed **strictly from ALB Security Group ID**.
  * **RDS SG**: Ingress `5432` allowed **strictly from ECS Tasks Security Group ID**.
  * **Private DB Subnets**: Isolated with no Internet Gateway or NAT routes.


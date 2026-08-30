# Architectural Approach & Technical Justifications

## 1. Executive Summary
This document details the engineering design decisions, trade-offs, and operational methodologies applied across the 3-tier containerized web application infrastructure and CI/CD pipelines for the DevOps Assignment.

---

## 2. Infrastructure Architecture & Design Choices

### 2.1 Compute Tier: AWS ECS Fargate vs. EC2 / EKS
* **Decision**: Deployed the containerized workloads using **AWS ECS Fargate** (Serverless Container Orchestration).
* **Rationale**:
  * **Zero Node Management**: Eliminates OS patching, AMI maintenance, and EC2 capacity planning.
  * **Task-Level Isolation**: Each container task gets dedicated kernel isolation and AWS VPC ENI (`awsvpc` network mode).
  * **Cost Efficiency**: Supports **Fargate Spot** capacity providers (`FARGATE_SPOT`), reducing compute costs by up to 70% in non-production environments.
  * **Simplicity vs. Kubernetes (EKS)**: For a 3-tier web application, ECS avoids the high operational overhead, control-plane costs (\$73/month per EKS cluster), and complex CNI/CSI ingress controllers of Kubernetes.

### 2.2 Network Topology: Multi-AZ Defense-in-Depth
* **Decision**: Designed a 3-tier Multi-AZ VPC network layout (`public`, `private-app`, `private-db`).
* **Rationale**:
  * **Public Subnets**: Host only the Application Load Balancer (ALB) and NAT Gateways. No application containers or databases reside here.
  * **Private Application Subnets**: ECS tasks run here without public IP addresses, accessing the internet for registry pulls and third-party APIs via NAT Gateways.
  * **Private Database Subnets**: Completely air-gapped with no route to the internet. Accessible strictly via port 5432 from the ECS Security Group.

### 2.3 Database Tier: Amazon RDS PostgreSQL 16
* **Decision**: Managed PostgreSQL 16 database with automated snapshots and storage autoscaling.
* **Rationale**:
  * **Operational Reliability**: Automated backups, minor version maintenance, and point-in-time recovery (PITR).
  * **Encryption**: AWS KMS encryption at rest (`gp3` storage) and SSL/TLS encrypted in-transit.
  * **Storage Autoscaling**: Automatically increases storage capacity as database load grows from 20 GB up to 100 GB.

### 2.4 Secrets Management: AWS Secrets Manager
* **Decision**: Stored database credentials in AWS Secrets Manager rather than static environment variables.
* **Rationale**:
  * **Zero Hardcoded Secrets**: DB passwords are dynamically generated via Terraform's `random_password` provider and referenced securely via IAM task execution roles.
  * **Auditability & Rotation**: Full AWS CloudTrail audit logs for secret access and native support for automated credential rotation.

---

## 3. CI/CD Pipeline Architecture (GitHub Actions)

### 3.1 Separation of Concerns: PR Validation vs. Continuous Delivery
* **PR Verification (`ci-pr.yml`)**:
  * Runs backend test suite (22 unit & integration tests) and frontend Vite production build.
  * Dependency security audits (`npm audit --audit-level=high`).
  * Repository & filesystem vulnerability scanning via **Trivy**.
  * Blocks merging if tests fail or high-severity CVEs are detected.

* **Continuous Delivery & Deployment (`cd-pipeline.yml`)**:
  * Triggered upon merge to `main`.
  * Builds immutable Docker images tagged with Git SHA (`sha-${{ github.sha }}`) and `latest`.
  * Performs container image vulnerability scanning using **Trivy**.
  * Deploys automatically to **Staging** and runs automated smoke tests.
  * **Manual Approval Gate**: Employs GitHub Environments protection rules requiring explicit human approval before deploying to **Production**.

---

## 4. Observability & Centralized Logging

### 4.1 Application Metrics (RED Method)
* Embedded Prometheus client (`prom-client`) directly in the Express backend:
  * **Rate**: `http_requests_total` partitioned by HTTP method, route, and status code.
  * **Errors**: Real-time ratio of 5xx HTTP server errors to total requests.
  * **Duration**: `http_request_duration_seconds` histogram providing $p50$, $p95$, and $p99$ response latency.
  * **Database Telemetry**: `database_query_duration_seconds` histogram and `database_errors_total`.

### 4.2 Centralized Logging Strategy
* Application logs use Winston with structured JSON formatting (`timestamp`, `level`, `message`, `metadata`).
* Integrated with AWS CloudWatch via ECS `awslogs` log driver with configurable retention periods (7 days staging / 30 days prod).

---

## 5. Summary of Best Practices
1. **Infrastructure as Code (IaC)**: 100% modular, parameterized, and validated Terraform.
2. **Shift-Left Security**: Automated vulnerability and secret scanning at PR and container build stages.
3. **Decoupled Lifecycle**: Terraform manages the infrastructure platform; CI/CD manages application images and rolling updates (`ignore_changes = [task_definition]`).
4. **Resiliency & Auto-Healing**: ECS circuit breaker rollbacks and ALB multi-AZ health probes.


# Outputs for Provisioned Infrastructure

output "vpc_id" {
  description = "The ID of the provisioned VPC"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "Public DNS name of the Application Load Balancer (Application URL)"
  value       = module.alb.alb_dns_name
}

output "application_url" {
  description = "Full HTTP URL to access the Frontend Application"
  value       = "http://${module.alb.alb_dns_name}"
}

output "backend_api_url" {
  description = "Full HTTP URL to access the Backend Health Endpoint"
  value       = "http://${module.alb.alb_dns_name}/api/health"
}

output "metrics_url" {
  description = "Full HTTP URL to scrape Prometheus metrics"
  value       = "http://${module.alb.alb_dns_name}/metrics"
}

output "rds_endpoint" {
  description = "Endpoint address of PostgreSQL RDS instance"
  value       = module.rds.endpoint
}

output "rds_address" {
  description = "Host address of PostgreSQL RDS instance"
  value       = module.rds.address
}

output "frontend_ecr_repository_url" {
  description = "Amazon ECR Repository URL for Frontend Docker images"
  value       = module.ecr.frontend_repository_url
}

output "backend_ecr_repository_url" {
  description = "Amazon ECR Repository URL for Backend Docker images"
  value       = module.ecr.backend_repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS Fargate Cluster"
  value       = module.ecs.cluster_name
}

output "frontend_service_name" {
  description = "Name of the Frontend ECS Service"
  value       = module.ecs.frontend_service_name
}

output "backend_service_name" {
  description = "Name of the Backend ECS Service"
  value       = module.ecs.backend_service_name
}

output "secrets_manager_secret_name" {
  description = "Name of Secrets Manager secret containing database credentials"
  value       = module.secrets.secret_name
}

output "secrets_manager_secret_arn" {
  description = "ARN of Secrets Manager secret containing database credentials"
  value       = module.secrets.secret_arn
}

output "frontend_log_group" {
  description = "CloudWatch Log Group for Frontend service"
  value       = module.ecs.frontend_log_group_name
}

output "backend_log_group" {
  description = "CloudWatch Log Group for Backend service"
  value       = module.ecs.backend_log_group_name
}

output "cloudwatch_dashboard_name" {
  description = "Name of the provisioned CloudWatch Dashboard"
  value       = module.monitoring.dashboard_name
}



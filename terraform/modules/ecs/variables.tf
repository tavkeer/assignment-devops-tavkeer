variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "devops-assignment"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_app_subnet_ids" {
  description = "List of private application subnet IDs"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "frontend_target_group_arn" {
  description = "ARN of frontend ALB target group"
  type        = string
}

variable "backend_target_group_arn" {
  description = "ARN of backend ALB target group"
  type        = string
}

variable "frontend_image" {
  description = "Container image for frontend"
  type        = string
  default     = "public.ecr.aws/nginx/nginx:alpine"
}

variable "backend_image" {
  description = "Container image for backend"
  type        = string
  default     = "public.ecr.aws/docker/library/node:20-alpine"
}

variable "frontend_cpu" {
  description = "Fargate CPU units for frontend (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Fargate Memory (MB) for frontend"
  type        = number
  default     = 512
}

variable "backend_cpu" {
  description = "Fargate CPU units for backend (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Fargate Memory (MB) for backend"
  type        = number
  default     = 512
}

variable "frontend_desired_count" {
  description = "Desired number of frontend task replicas"
  type        = number
  default     = 2
}

variable "backend_desired_count" {
  description = "Desired number of backend task replicas"
  type        = number
  default     = 2
}

variable "use_fargate_spot" {
  description = "Use FARGATE_SPOT capacity provider for cost savings"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "db_host" {
  description = "PostgreSQL DB host"
  type        = string
  default     = ""
}

variable "db_name" {
  description = "PostgreSQL DB name"
  type        = string
  default     = "devops_db"
}

variable "db_user" {
  description = "PostgreSQL DB user"
  type        = string
  default     = "devops_admin"
}

variable "secret_arn" {
  description = "ARN of Secrets Manager secret containing DB credentials"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}


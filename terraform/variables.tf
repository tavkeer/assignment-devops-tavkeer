# Root Variables for AWS Infrastructure Deployment

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "devops-assignment"
}

variable "environment" {
  description = "Target deployment environment (staging, production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production", "prod", "dev"], var.environment)
    error_message = "Environment must be one of: 'staging', 'production', 'prod', 'dev'."
  }
}

variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "us-east-1"
}

# Networking Variables
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones list (defaults to first 2 in region)"
  type        = list(string)
  default     = []
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets outbound access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use single NAT Gateway to reduce staging costs"
  type        = bool
  default     = true
}

# Database Variables
variable "db_name" {
  description = "PostgreSQL initial database name"
  type        = string
  default     = "devops_db"
}

variable "db_username" {
  description = "PostgreSQL administrator username"
  type        = string
  default     = "devops_admin"
}

variable "db_password" {
  description = "Optional PostgreSQL master password (auto-generated if empty)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS DB instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS initial storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS max storage for autoscaling in GB"
  type        = number
  default     = 100
}

variable "db_multi_az" {
  description = "Enable Multi-AZ RDS deployment for high availability"
  type        = bool
  default     = false
}

variable "db_backup_retention_period" {
  description = "Days of automated database backups to retain (1 for Free Tier)"
  type        = number
  default     = 1
}

variable "db_deletion_protection" {
  description = "Prevent accidental deletion of RDS database"
  type        = bool
  default     = false
}

# ECS Container Variables
variable "frontend_image" {
  description = "Frontend Docker image URI (bootstrap placeholder or ECR URI)"
  type        = string
  default     = "public.ecr.aws/nginx/nginx:alpine"
}

variable "backend_image" {
  description = "Backend Docker image URI (bootstrap placeholder or ECR URI)"
  type        = string
  default     = "public.ecr.aws/docker/library/node:20-alpine"
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

variable "frontend_cpu" {
  description = "Fargate CPU units for frontend (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Fargate RAM in MB for frontend"
  type        = number
  default     = 512
}

variable "backend_cpu" {
  description = "Fargate CPU units for backend (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Fargate RAM in MB for backend"
  type        = number
  default     = 512
}

variable "use_fargate_spot" {
  description = "Use Fargate Spot instances for non-prod cost savings"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "tags" {
  description = "Custom resource tags"
  type        = map(string)
  default     = {}
}


variable "project_name" {
  description = "Name of project"
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

variable "alb_arn_suffix" {
  description = "ARN suffix of Application Load Balancer"
  type        = string
}

variable "ecs_cluster_name" {
  description = "Name of ECS Cluster"
  type        = string
}

variable "frontend_service_name" {
  description = "Name of Frontend ECS Service"
  type        = string
}

variable "backend_service_name" {
  description = "Name of Backend ECS Service"
  type        = string
}

variable "rds_instance_id" {
  description = "RDS DB Instance Identifier"
  type        = string
}


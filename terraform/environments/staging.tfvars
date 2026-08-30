# Staging Environment Configuration (Cost-optimized & lightweight)
project_name = "devops-assignment"
environment  = "staging"
aws_region   = "us-east-1"
vpc_cidr     = "10.10.0.0/16"

# Cost Optimization: Single NAT Gateway for non-prod
enable_nat_gateway = true
single_nat_gateway = true

# Database: Single-AZ, burstable instance
db_name                    = "devops_staging_db"
db_username                = "staging_admin"
db_instance_class          = "db.t4g.micro"
db_allocated_storage       = 20
db_max_allocated_storage   = 50
db_multi_az                = false
db_backup_retention_period = 1
db_deletion_protection     = false

# Compute: Fargate Spot for non-prod savings
frontend_desired_count = 2
backend_desired_count  = 2
frontend_cpu           = 256
frontend_memory        = 512
backend_cpu            = 256
backend_memory         = 512
use_fargate_spot       = true
log_retention_days     = 7

tags = {
  Environment = "staging"
  ManagedBy   = "Terraform"
  CostCenter  = "DevOps-Staging"
}


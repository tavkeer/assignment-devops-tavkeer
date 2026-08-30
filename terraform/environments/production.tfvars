# Production Environment Configuration (High Availability, Multi-AZ, Protected)
project_name = "devops-assignment"
environment  = "production"
aws_region   = "us-east-1"
vpc_cidr     = "10.20.0.0/16"

# High Availability: Multi-AZ NAT Gateways
enable_nat_gateway = true
single_nat_gateway = false

# Database: Configured for Free Tier account compatibility
db_name                    = "devops_prod_db"
db_username                = "prod_admin"
db_instance_class          = "db.t4g.micro"
db_allocated_storage       = 20
db_max_allocated_storage   = 50
db_multi_az                = false
db_backup_retention_period = 1
db_deletion_protection     = false

# Compute: Standard Fargate (On-Demand) with higher replica count & redundancy
frontend_desired_count = 3
backend_desired_count  = 3
frontend_cpu           = 512
frontend_memory        = 1024
backend_cpu            = 512
backend_memory         = 1024
use_fargate_spot       = false
log_retention_days     = 30

tags = {
  Environment = "production"
  ManagedBy   = "Terraform"
  Criticality = "High"
}


# Root Infrastructure Provisioning: 3-Tier Production Architecture

# 1. Multi-AZ Networking Module
module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway
  tags               = var.tags
}

# 2. Least-Privilege Security Groups Module
module "security" {
  source = "./modules/security"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  tags         = var.tags
}

# 3. AWS Secrets Manager (Database Credentials)
module "secrets" {
  source = "./modules/secrets"

  project_name = var.project_name
  environment  = var.environment
  db_name      = var.db_name
  db_username  = var.db_username
  db_password  = var.db_password
  tags         = var.tags
}

# 4. Amazon ECR Container Repositories
module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
  tags         = var.tags
}

# 5. Application Load Balancer
module "alb" {
  source = "./modules/alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  security_group_id = module.security.alb_security_group_id
  tags              = var.tags
}

# 6. Managed PostgreSQL RDS (Private Subnet)
module "rds" {
  source = "./modules/rds"

  project_name            = var.project_name
  environment             = var.environment
  subnet_ids              = module.vpc.private_db_subnet_ids
  security_group_id       = module.security.rds_security_group_id
  db_name                 = var.db_name
  db_username             = var.db_username
  db_password             = module.secrets.db_password
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  multi_az                = var.db_multi_az
  backup_retention_period = var.db_backup_retention_period
  deletion_protection     = var.db_deletion_protection
  skip_final_snapshot     = var.environment != "production"
  tags                    = var.tags
}

# 7. ECS Fargate Cluster, Task Definitions, and Services
module "ecs" {
  source = "./modules/ecs"

  project_name              = var.project_name
  environment               = var.environment
  aws_region                = var.aws_region
  vpc_id                    = module.vpc.vpc_id
  private_app_subnet_ids    = module.vpc.private_app_subnet_ids
  security_group_id         = module.security.ecs_tasks_security_group_id
  frontend_target_group_arn = module.alb.frontend_target_group_arn
  backend_target_group_arn  = module.alb.backend_target_group_arn
  frontend_image            = var.frontend_image
  backend_image             = var.backend_image
  frontend_cpu              = var.frontend_cpu
  frontend_memory           = var.frontend_memory
  backend_cpu               = var.backend_cpu
  backend_memory            = var.backend_memory
  frontend_desired_count    = var.frontend_desired_count
  backend_desired_count     = var.backend_desired_count
  use_fargate_spot          = var.use_fargate_spot
  log_retention_days        = var.log_retention_days
  db_host                   = module.rds.address
  db_name                   = var.db_name
  db_user                   = var.db_username
  secret_arn                = module.secrets.secret_arn
  tags                      = var.tags

  depends_on = [module.rds, module.alb]
}

# 8. Centralized CloudWatch Monitoring Dashboard
module "monitoring" {
  source = "./modules/monitoring"

  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  alb_arn_suffix        = module.alb.arn_suffix
  ecs_cluster_name      = module.ecs.cluster_name
  frontend_service_name = module.ecs.frontend_service_name
  backend_service_name  = module.ecs.backend_service_name
  rds_instance_id       = module.rds.db_instance_id

  depends_on = [module.alb, module.ecs, module.rds]
}



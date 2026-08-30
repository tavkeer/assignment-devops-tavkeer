# RDS PostgreSQL Module: Managed Relational Database

resource "aws_db_subnet_group" "main" {
  name        = "${var.environment}-${var.project_name}-db-subnet-group"
  description = "Subnet group for ${var.project_name} PostgreSQL database"
  subnet_ids  = var.subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-db-subnet-group"
    }
  )
}

resource "aws_db_parameter_group" "postgres16" {
  name        = "${var.environment}-${var.project_name}-pg16-params"
  family      = "postgres16"
  description = "Custom parameter group for PostgreSQL 16"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_duration"
    value = "0"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "500" # Log queries taking more than 500ms
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-pg16-params"
    }
  )
}

resource "aws_db_instance" "postgres" {
  identifier            = "${var.environment}-${var.project_name}-db"
  engine                = "postgres"
  engine_version        = var.engine_version
  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 5432

  multi_az               = var.multi_az
  publicly_accessible    = false
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]
  parameter_group_name   = aws_db_parameter_group.postgres16.name

  backup_retention_period     = var.backup_retention_period
  backup_window               = "03:00-04:00"
  maintenance_window          = "Mon:04:30-Mon:05:30"
  auto_minor_version_upgrade  = true
  allow_major_version_upgrade = false

  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = "${var.environment}-${var.project_name}-final-snapshot"

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-rds-postgres"
    }
  )
}


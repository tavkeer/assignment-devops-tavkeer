# Security Groups Module: Principle of Least Privilege Chaining

# 1. ALB Security Group (Internet-facing)
resource "aws_security_group" "alb" {
  name        = "${var.environment}-${var.project_name}-alb-sg"
  description = "Controls public inbound traffic to the Application Load Balancer"
  vpc_id      = var.vpc_id

  # Ingress HTTP
  ingress {
    description = "Allow inbound HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress HTTPS
  ingress {
    description = "Allow inbound HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress to anywhere (traffic will be restricted at the ECS SG layer)
  egress {
    description = "Allow outbound traffic from ALB"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-alb-sg"
    }
  )
}

# 2. ECS Tasks Security Group (Application Tier)
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.environment}-${var.project_name}-ecs-tasks-sg"
  description = "Allows traffic ONLY from the Application Load Balancer to ECS Tasks"
  vpc_id      = var.vpc_id

  # Ingress Frontend (Nginx on Port 80) ONLY from ALB SG
  ingress {
    description     = "Allow HTTP traffic from ALB to Frontend Container"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Ingress Backend (Express API on Port 5000) ONLY from ALB SG
  ingress {
    description     = "Allow API traffic from ALB to Backend Container"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Internal container-to-container communication (if needed within same task/service)
  ingress {
    description = "Allow internal traffic within ECS tasks security group"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  # Egress to internet via NAT Gateway (for downloading dependencies, CloudWatch, ECR pulls)
  egress {
    description = "Allow all outbound traffic from ECS tasks"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-ecs-tasks-sg"
    }
  )
}

# 3. RDS PostgreSQL Security Group (Data Tier)
resource "aws_security_group" "rds" {
  name        = "${var.environment}-${var.project_name}-rds-sg"
  description = "Allows PostgreSQL traffic ONLY from the ECS Tasks security group"
  vpc_id      = var.vpc_id

  # Ingress PostgreSQL (5432) ONLY from ECS Tasks SG
  ingress {
    description     = "Allow PostgreSQL access strictly from ECS Tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    description = "Allow outbound responses from RDS"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-rds-sg"
    }
  )
}


# ALB Module: Application Load Balancer with Multi-Target Routing

locals {
  # Keep name under AWS 32-character limit for ALB/Target Groups without trailing hyphens
  name_prefix = var.environment == "production" ? "prod-${var.project_name}" : "${var.environment}-${var.project_name}"
}

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.enable_deletion_protection
  drop_invalid_header_fields = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-alb"
    }
  )
}

# Frontend Target Group (Port 80)
resource "aws_lb_target_group" "frontend" {
  name                 = "${local.name_prefix}-fe-tg"
  port                 = 80
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = "/healthz"
    protocol            = "HTTP"
    port                = "80"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(
    var.tags,
    {
      Name      = "${var.environment}-${var.project_name}-fe-tg"
      Component = "Frontend"
    }
  )
}

# Backend Target Group (Port 5000)
resource "aws_lb_target_group" "backend" {
  name                 = "${local.name_prefix}-be-tg"
  port                 = 5000
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = "/api/health"
    protocol            = "HTTP"
    port                = "5000"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(
    var.tags,
    {
      Name      = "${var.environment}-${var.project_name}-be-tg"
      Component = "Backend"
    }
  )
}

# ALB HTTP Listener (Port 80)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  # Default forward to Frontend (React Nginx)
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Routing Rule: Forward `/api/*` to Backend API (Express.js)
resource "aws_lb_listener_rule" "backend_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/metrics"]
    }
  }
}


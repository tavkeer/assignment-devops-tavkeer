# Secrets Manager Module: Secure Database Credential Management

resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.environment}/${var.project_name}/database"
  description             = "PostgreSQL credentials for ${var.project_name} in ${var.environment}"
  recovery_window_in_days = 0 # Immediate deletion on destroy for clean teardown

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-db-secret"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password != "" ? var.db_password : random_password.db_password.result
    database = var.db_name
    engine   = "postgres"
    port     = 5432
  })
}


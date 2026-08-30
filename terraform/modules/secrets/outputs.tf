output "secret_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.db_credentials.name
}

output "db_password" {
  description = "The database password"
  value       = var.db_password != "" ? var.db_password : random_password.db_password.result
  sensitive   = true
}

output "db_username" {
  description = "The database master username"
  value       = var.db_username
}

output "db_name" {
  description = "The database name"
  value       = var.db_name
}


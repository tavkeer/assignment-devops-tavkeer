output "endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.postgres.endpoint
}

output "address" {
  description = "The hostname of the RDS instance"
  value       = aws_db_instance.postgres.address
}

output "port" {
  description = "The database port"
  value       = aws_db_instance.postgres.port
}

output "db_name" {
  description = "The database name"
  value       = aws_db_instance.postgres.db_name
}

output "db_instance_id" {
  description = "The RDS instance ID"
  value       = aws_db_instance.postgres.identifier
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.postgres.arn
}


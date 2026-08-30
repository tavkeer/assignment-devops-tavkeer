output "cluster_id" {
  description = "The ID of the ECS Cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "The name of the ECS Cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "The ARN of the ECS Cluster"
  value       = aws_ecs_cluster.main.arn
}

output "frontend_service_name" {
  description = "The name of the frontend ECS Service"
  value       = aws_ecs_service.frontend.name
}

output "backend_service_name" {
  description = "The name of the backend ECS Service"
  value       = aws_ecs_service.backend.name
}

output "execution_role_arn" {
  description = "The ARN of the ECS Execution IAM Role"
  value       = aws_iam_role.ecs_execution_role.arn
}

output "task_role_arn" {
  description = "The ARN of the ECS Task IAM Role"
  value       = aws_iam_role.ecs_task_role.arn
}

output "frontend_log_group_name" {
  description = "CloudWatch log group name for frontend"
  value       = aws_cloudwatch_log_group.frontend.name
}

output "backend_log_group_name" {
  description = "CloudWatch log group name for backend"
  value       = aws_cloudwatch_log_group.backend.name
}


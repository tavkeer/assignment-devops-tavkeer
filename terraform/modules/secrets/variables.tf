variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "devops-assignment"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "devops_db"
}

variable "db_username" {
  description = "Master username for database"
  type        = string
  default     = "devops_admin"
}

variable "db_password" {
  description = "Optional explicit master password for database (randomly generated if empty)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}


variable "aws_region" {
  description = "AWS region used by the Alertas stack."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix used for AWS resource names."
  type        = string
  default     = "alertas"
}

variable "backend_image" {
  description = "Container image for plus-ms-alerts."
  type        = string
}

variable "frontend_image" {
  description = "Container image for plus-mfe-alerts."
  type        = string
}

variable "mongo_image" {
  description = "Container image for MongoDB."
  type        = string
  default     = "mongo:7"
}

variable "jwt_secret" {
  description = "JWT secret shared with the auth service that issues tokens."
  type        = string
  sensitive   = true
}

variable "auth_api_url" {
  description = "Public URL of the auth API used by the alert frontend."
  type        = string
  default     = "http://localhost:3001"
}

variable "admin_roles" {
  description = "Comma-separated admin roles accepted by plus-ms-alerts."
  type        = string
  default     = "ADMIN,ADM,admin"
}

variable "monitor_interval_ms" {
  description = "Stock monitor interval in milliseconds."
  type        = number
  default     = 60000
}

variable "desired_count_backend" {
  description = "Number of plus-ms-alerts tasks."
  type        = number
  default     = 1
}

variable "desired_count_frontend" {
  description = "Number of plus-mfe-alerts tasks."
  type        = number
  default     = 1
}

variable "backend_cpu" {
  description = "Fargate CPU units for plus-ms-alerts."
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Fargate memory for plus-ms-alerts."
  type        = number
  default     = 1024
}

variable "frontend_cpu" {
  description = "Fargate CPU units for plus-mfe-alerts."
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Fargate memory for plus-mfe-alerts."
  type        = number
  default     = 512
}

variable "mongo_cpu" {
  description = "Fargate CPU units for MongoDB."
  type        = number
  default     = 512
}

variable "mongo_memory" {
  description = "Fargate memory for MongoDB."
  type        = number
  default     = 1024
}

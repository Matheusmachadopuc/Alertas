output "application_url" {
  description = "Public URL for the Alertas frontend. The same ALB also routes /alerta and /health to the backend."
  value       = "http://${aws_lb.main.dns_name}"
}

output "backend_health_url" {
  description = "Public health URL for plus-ms-alerts through the ALB."
  value       = "http://${aws_lb.main.dns_name}/health"
}

output "mongodb_uri" {
  description = "Internal MongoDB URI used by plus-ms-alerts."
  value       = local.mongodb_uri
}

output "efs_file_system_id" {
  description = "EFS file system that persists MongoDB data."
  value       = aws_efs_file_system.mongo.id
}

output "sns_topic_arn" {
  description = "SNS topic used by alert notifications."
  value       = aws_sns_topic.alerts.arn
}

output "sqs_queue_url" {
  description = "SQS queue subscribed to the alert SNS topic."
  value       = aws_sqs_queue.alerts.url
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name         = var.project_name
  azs          = slice(data.aws_availability_zones.available.names, 0, 2)
  public_cidrs = ["10.42.1.0/24", "10.42.2.0/24"]
  mongodb_uri  = "mongodb://mongo-alertas.${local.name}.local:27017/api-alertas"
  alerts_api   = "http://${aws_lb.main.dns_name}"
  common_tags = {
    Project = local.name
    Stack   = "alertas"
  }
}

resource "aws_vpc" "main" {
  cidr_block           = "10.42.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${local.name}-vpc"
  })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.name}-igw"
  })
}

resource "aws_subnet" "public" {
  count                   = length(local.azs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.name}-public-${count.index + 1}"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.name}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb-sg"
  description = "Public access to Alertas ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_security_group" "frontend" {
  name        = "${local.name}-frontend-sg"
  description = "Frontend tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 4002
    to_port         = 4002
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_security_group" "backend" {
  name        = "${local.name}-backend-sg"
  description = "Backend tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3002
    to_port         = 3002
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_security_group" "mongo" {
  name        = "${local.name}-mongo-sg"
  description = "MongoDB task"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_security_group" "efs" {
  name        = "${local.name}-efs-sg"
  description = "EFS mount targets for MongoDB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.mongo.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_lb" "main" {
  name               = "${local.name}-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = local.common_tags
}

resource "aws_lb_target_group" "frontend" {
  name        = "${local.name}-mfe-alerts"
  port        = 4002
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  health_check {
    enabled = true
    path    = "/"
    matcher = "200-399"
  }

  tags = local.common_tags
}

resource "aws_lb_target_group" "backend" {
  name        = "${local.name}-ms-alerts"
  port        = 3002
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  health_check {
    enabled = true
    path    = "/health"
    matcher = "200-399"
  }

  tags = local.common_tags
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_lb_listener_rule" "backend_alerta" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/alerta", "/alerta/*", "/health"]
    }
  }
}

resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${local.name}.local"
  description = "Private DNS namespace for Alertas ECS services"
  vpc         = aws_vpc.main.id

  tags = local.common_tags
}

resource "aws_service_discovery_service" "mongo" {
  name = "mongo-alertas"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  tags = local.common_tags
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name}/plus-ms-alerts"
  retention_in_days = 14
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${local.name}/plus-mfe-alerts"
  retention_in_days = 14
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "mongo" {
  name              = "/ecs/${local.name}/mongo-alertas"
  retention_in_days = 14
  tags              = local.common_tags
}

resource "aws_efs_file_system" "mongo" {
  encrypted = true

  tags = merge(local.common_tags, {
    Name = "${local.name}-mongo-efs"
  })
}

resource "aws_efs_mount_target" "mongo" {
  count           = length(aws_subnet.public)
  file_system_id  = aws_efs_file_system.mongo.id
  subnet_id       = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_access_point" "mongo" {
  file_system_id = aws_efs_file_system.mongo.id

  posix_user {
    gid = 999
    uid = 999
  }

  root_directory {
    path = "/mongo"

    creation_info {
      owner_gid   = 999
      owner_uid   = 999
      permissions = "0755"
    }
  }

  tags = local.common_tags
}

resource "aws_sns_topic" "alerts" {
  name = "${local.name}-estoque"
  tags = local.common_tags
}

resource "aws_sqs_queue" "alerts" {
  name = "${local.name}-estoque-queue"
  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "alerts_queue" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.alerts.arn
}

data "aws_iam_policy_document" "alerts_queue" {
  statement {
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.alerts.arn]

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.alerts.arn]
    }
  }
}

resource "aws_sqs_queue_policy" "alerts" {
  queue_url = aws_sqs_queue.alerts.id
  policy    = data.aws_iam_policy_document.alerts_queue.json
}

resource "aws_iam_role" "ecs_execution" {
  name = "${local.name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "ecs_task" {
  name = "${local.name}-ecs-task-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:ClientRootAccess"
        ]
        Resource = aws_efs_file_system.mongo.arn
      }
    ]
  })
}

resource "aws_ecs_task_definition" "mongo" {
  family                   = "${local.name}-mongo-alertas"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.mongo_cpu
  memory                   = var.mongo_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  volume {
    name = "mongo-data"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.mongo.id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = aws_efs_access_point.mongo.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "mongo-alertas"
      image     = var.mongo_image
      essential = true
      portMappings = [{
        containerPort = 27017
        hostPort      = 27017
        protocol      = "tcp"
      }]
      mountPoints = [{
        sourceVolume  = "mongo-data"
        containerPath = "/data/db"
        readOnly      = false
      }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.mongo.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  depends_on = [aws_efs_mount_target.mongo]

  tags = local.common_tags
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name}-plus-ms-alerts"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "plus-ms-alerts"
      image     = var.backend_image
      essential = true
      portMappings = [{
        containerPort = 3002
        hostPort      = 3002
        protocol      = "tcp"
      }]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3002" },
        { name = "MONGODB_URI", value = local.mongodb_uri },
        { name = "JWT_SECRET", value = var.jwt_secret },
        { name = "JWT_ALGORITHMS", value = "HS256" },
        { name = "ADMIN_ROLES", value = var.admin_roles },
        { name = "ALERTS_MONITOR_INTERVAL_MS", value = tostring(var.monitor_interval_ms) },
        { name = "ALERTS_NOTIFICATION_TOPIC_ARN", value = aws_sns_topic.alerts.arn },
        { name = "AWS_DEFAULT_REGION", value = var.aws_region },
        { name = "CORS_ORIGIN", value = "http://${aws_lb.main.dns_name}" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = local.common_tags
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${local.name}-plus-mfe-alerts"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "plus-mfe-alerts"
      image     = var.frontend_image
      essential = true
      portMappings = [{
        containerPort = 4002
        hostPort      = 4002
        protocol      = "tcp"
      }]
      environment = [
        { name = "VITE_MS_AUTH_URL", value = var.auth_api_url },
        { name = "VITE_MS_ALERTS_URL", value = local.alerts_api }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.frontend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = local.common_tags
}

resource "aws_ecs_service" "mongo" {
  name            = "mongo-alertas"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.mongo.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    assign_public_ip = true
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.mongo.id]
  }

  service_registries {
    registry_arn = aws_service_discovery_service.mongo.arn
  }

  tags = local.common_tags
}

resource "aws_ecs_service" "backend" {
  name            = "plus-ms-alerts"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.desired_count_backend
  launch_type     = "FARGATE"

  network_configuration {
    assign_public_ip = true
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.backend.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "plus-ms-alerts"
    container_port   = 3002
  }

  depends_on = [
    aws_lb_listener.http,
    aws_ecs_service.mongo
  ]

  tags = local.common_tags
}

resource "aws_ecs_service" "frontend" {
  name            = "plus-mfe-alerts"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = var.desired_count_frontend
  launch_type     = "FARGATE"

  network_configuration {
    assign_public_ip = true
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.frontend.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "plus-mfe-alerts"
    container_port   = 4002
  }

  depends_on = [aws_lb_listener.http]

  tags = local.common_tags
}

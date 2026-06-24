param(
  [string]$Region = "us-east-1",
  [string]$AccountId = "631412642179",
  [string]$Cluster = "alertas-cluster",
  [string]$Project = "alertas",
  [string]$JwtSecret = "dev-secret"
)

$ErrorActionPreference = "Continue"
$PSNativeCommandUseErrorActionPreference = $false
$env:PYTHONWARNINGS = "ignore"
$NoVerify = @("--no-verify-ssl")
$Registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$AlbName = "$Project-alb"
$NamespaceName = "$Project.local"
$Images = @("plus-ms-auth", "plus-ms-estoque-fake", "plus-mfe-auth", "plus-mfe-alerts")

function AwsJson([string[]]$Args) {
  $out = aws @Args @NoVerify --output json
  if (-not $out) { return $null }
  return $out | ConvertFrom-Json
}

function Ensure-EcrRepo([string]$Name) {
  aws ecr describe-repositories --repository-names $Name --region $Region @NoVerify *> $null
  if ($LASTEXITCODE -ne 0) {
    aws ecr create-repository --repository-name $Name --region $Region @NoVerify | Out-Null
  }
}

function Ensure-LogGroup([string]$Name) {
  aws logs create-log-group --log-group-name $Name --region $Region @NoVerify 2>$null
  aws logs put-retention-policy --log-group-name $Name --retention-in-days 14 --region $Region @NoVerify | Out-Null
}

function Ensure-Sg([string]$Name, [string]$Description, [string]$VpcId) {
  $found = AwsJson @("ec2","describe-security-groups","--filters","Name=group-name,Values=$Name","Name=vpc-id,Values=$VpcId","--region",$Region)
  if ($found.SecurityGroups.Count -gt 0) { return $found.SecurityGroups[0].GroupId }
  $created = AwsJson @("ec2","create-security-group","--group-name",$Name,"--description",$Description,"--vpc-id",$VpcId,"--region",$Region)
  return $created.GroupId
}

function Allow-Ingress([string]$GroupId, [int]$Port, [string]$SourceSg) {
  aws ec2 authorize-security-group-ingress --group-id $GroupId --protocol tcp --port $Port --source-group $SourceSg --region $Region @NoVerify 2>$null
}

function Ensure-ServiceDiscovery([string]$Name, [string]$NamespaceId) {
  $services = AwsJson @("servicediscovery","list-services","--filters","Name=NAMESPACE_ID,Values=$NamespaceId,Condition=EQ","--region",$Region)
  $existing = $services.Services | Where-Object { $_.Name -eq $Name } | Select-Object -First 1
  if ($existing) { return $existing.Id }
  $created = AwsJson @("servicediscovery","create-service","--name",$Name,"--dns-config","NamespaceId=$NamespaceId,DnsRecords=[{Type=A,TTL=10}],RoutingPolicy=MULTIVALUE","--region",$Region)
  return $created.Service.Id
}

function Ensure-TargetGroup([string]$Name, [int]$Port, [string]$HealthPath, [string]$VpcId) {
  $existing = AwsJson @("elbv2","describe-target-groups","--names",$Name,"--region",$Region) 2>$null
  if ($LASTEXITCODE -eq 0 -and $existing.TargetGroups.Count -gt 0) { return $existing.TargetGroups[0].TargetGroupArn }
  $created = AwsJson @("elbv2","create-target-group","--name",$Name,"--protocol","HTTP","--port",[string]$Port,"--target-type","ip","--vpc-id",$VpcId,"--health-check-path",$HealthPath,"--matcher","HttpCode=200-399","--region",$Region)
  return $created.TargetGroups[0].TargetGroupArn
}

function Ensure-Rule([string]$ListenerArn, [int]$Priority, [string[]]$Paths, [string]$TargetGroupArn) {
  $rules = AwsJson @("elbv2","describe-rules","--listener-arn",$ListenerArn,"--region",$Region)
  $existing = $rules.Rules | Where-Object { $_.Priority -eq [string]$Priority } | Select-Object -First 1
  if ($existing) { return }
  $pathCsv = ($Paths -join ",")
  aws elbv2 create-rule --listener-arn $ListenerArn --priority $Priority --conditions "Field=path-pattern,Values=$pathCsv" --actions "Type=forward,TargetGroupArn=$TargetGroupArn" --region $Region @NoVerify | Out-Null
}

function Register-Task([hashtable]$Spec) {
  $jsonPath = Join-Path $env:TEMP "$($Spec.Family).json"
  $Spec | ConvertTo-Json -Depth 20 | Set-Content -Path $jsonPath -Encoding ascii
  $registered = AwsJson @("ecs","register-task-definition","--cli-input-json","file://$jsonPath","--region",$Region)
  return $registered.taskDefinition.taskDefinitionArn
}


function Set-ContainerEnv([object]$Container, [string]$Name, [string]$Value) {
  $envList = @($Container.environment | Where-Object { $_.name -ne $Name })
  $envList += @{ name = $Name; value = $Value }
  $Container.environment = $envList
}

function Register-UpdatedTaskEnv([string]$TaskDefinition, [string]$ContainerName, [hashtable]$EnvUpdates) {
  $current = AwsJson @("ecs","describe-task-definition","--task-definition",$TaskDefinition,"--region",$Region)
  $td = $current.taskDefinition
  $container = $td.containerDefinitions | Where-Object { $_.name -eq $ContainerName } | Select-Object -First 1
  foreach ($key in $EnvUpdates.Keys) { Set-ContainerEnv $container $key $EnvUpdates[$key] }

  $spec = @{
    family = $td.family
    taskRoleArn = $td.taskRoleArn
    executionRoleArn = $td.executionRoleArn
    networkMode = $td.networkMode
    containerDefinitions = $td.containerDefinitions
    volumes = @($td.volumes)
    placementConstraints = @($td.placementConstraints)
    requiresCompatibilities = @($td.requiresCompatibilities)
    cpu = $td.cpu
    memory = $td.memory
  }

  return Register-Task $spec
}
function Upsert-Service([string]$Name, [string]$TaskDef, [string[]]$Subnets, [string]$SgId, [object]$Lb = $null, [string]$RegistryArn = $null) {
  aws ecs describe-services --cluster $Cluster --services $Name --region $Region @NoVerify *> $null
  $network = "awsvpcConfiguration={subnets=[$($Subnets -join ',')],securityGroups=[$SgId],assignPublicIp=ENABLED}"
  if ($LASTEXITCODE -eq 0) {
    aws ecs update-service --cluster $Cluster --service $Name --task-definition $TaskDef --desired-count 1 --region $Region @NoVerify | Out-Null
    return
  }
  $args = @("ecs","create-service","--cluster",$Cluster,"--service-name",$Name,"--task-definition",$TaskDef,"--desired-count","1","--launch-type","FARGATE","--network-configuration",$network,"--region",$Region)
  if ($Lb) { $args += @("--load-balancers", "targetGroupArn=$($Lb.TargetGroupArn),containerName=$($Lb.ContainerName),containerPort=$($Lb.ContainerPort)") }
  if ($RegistryArn) { $args += @("--service-registries", "registryArn=$RegistryArn") }
  aws @args @NoVerify | Out-Null
}

foreach ($image in $Images) { Ensure-EcrRepo $image }
aws ecr get-login-password --region $Region @NoVerify | docker login --username AWS --password-stdin $Registry
foreach ($image in $Images) { docker push "$Registry/$image`:latest" }

$lb = (AwsJson @("elbv2","describe-load-balancers","--names",$AlbName,"--region",$Region)).LoadBalancers[0]
$listener = (AwsJson @("elbv2","describe-listeners","--load-balancer-arn",$lb.LoadBalancerArn,"--region",$Region)).Listeners[0]
$vpcId = $lb.VpcId
$subnets = @($lb.AvailabilityZones | ForEach-Object { $_.SubnetId })
$albSg = $lb.SecurityGroups[0]
$namespace = (AwsJson @("servicediscovery","list-namespaces","--region",$Region)).Namespaces | Where-Object { $_.Name -eq $NamespaceName } | Select-Object -First 1
$namespaceId = $namespace.Id

$roles = AwsJson @("ecs","describe-task-definition","--task-definition","alertas-plus-ms-alerts","--region",$Region)
$executionRoleArn = $roles.taskDefinition.executionRoleArn
$taskRoleArn = $roles.taskDefinition.taskRoleArn

$authSg = Ensure-Sg "$Project-auth-sg" "Auth API tasks" $vpcId
$stockSg = Ensure-Sg "$Project-estoque-fake-sg" "Estoque fake tasks" $vpcId
$postgresSg = Ensure-Sg "$Project-postgres-auth-sg" "Postgres auth demo" $vpcId
$backendSg = (AwsJson @("ec2","describe-security-groups","--filters","Name=group-name,Values=$Project-backend-sg","Name=vpc-id,Values=$vpcId","--region",$Region)).SecurityGroups[0].GroupId
Allow-Ingress $authSg 3001 $albSg
Allow-Ingress $stockSg 3000 $albSg
Allow-Ingress $stockSg 3000 $backendSg
Allow-Ingress $postgresSg 5432 $authSg

$postgresSd = Ensure-ServiceDiscovery "postgres-auth" $namespaceId
$stockSd = Ensure-ServiceDiscovery "estoque-fake" $namespaceId
$authTg = Ensure-TargetGroup "$Project-ms-auth" 3001 "/" $vpcId
$stockTg = Ensure-TargetGroup "$Project-estoque-fake" 3000 "/health" $vpcId
Ensure-Rule $listener.ListenerArn 20 @("/auth", "/auth/*") $authTg
Ensure-Rule $listener.ListenerArn 30 @("/estoque", "/estoque/*") $stockTg

Ensure-LogGroup "/ecs/$Project/plus-ms-auth"
Ensure-LogGroup "/ecs/$Project/plus-ms-estoque-fake"
Ensure-LogGroup "/ecs/$Project/postgres-auth"

$postgresTask = Register-Task @{
  family = "$Project-postgres-auth"; requiresCompatibilities = @("FARGATE"); networkMode = "awsvpc"; cpu = "256"; memory = "512"; executionRoleArn = $executionRoleArn; taskRoleArn = $taskRoleArn;
  containerDefinitions = @(@{ name = "postgres-auth"; image = "postgres:16-alpine"; essential = $true; portMappings = @(@{ containerPort = 5432; hostPort = 5432; protocol = "tcp" }); environment = @(@{name="POSTGRES_USER";value="plus"},@{name="POSTGRES_PASSWORD";value="plus_secret"},@{name="POSTGRES_DB";value="plus_auth"}); logConfiguration = @{ logDriver="awslogs"; options=@{ "awslogs-group"="/ecs/$Project/postgres-auth"; "awslogs-region"=$Region; "awslogs-stream-prefix"="ecs" } } })
}
$stockTask = Register-Task @{
  family = "$Project-plus-ms-estoque-fake"; requiresCompatibilities = @("FARGATE"); networkMode = "awsvpc"; cpu = "256"; memory = "512"; executionRoleArn = $executionRoleArn; taskRoleArn = $taskRoleArn;
  containerDefinitions = @(@{ name = "plus-ms-estoque-fake"; image = "$Registry/plus-ms-estoque-fake`:latest"; essential = $true; portMappings = @(@{ containerPort = 3000; hostPort = 3000; protocol = "tcp" }); logConfiguration = @{ logDriver="awslogs"; options=@{ "awslogs-group"="/ecs/$Project/plus-ms-estoque-fake"; "awslogs-region"=$Region; "awslogs-stream-prefix"="ecs" } } })
}
$authTask = Register-Task @{
  family = "$Project-plus-ms-auth"; requiresCompatibilities = @("FARGATE"); networkMode = "awsvpc"; cpu = "512"; memory = "1024"; executionRoleArn = $executionRoleArn; taskRoleArn = $taskRoleArn;
  containerDefinitions = @(@{ name = "plus-ms-auth"; image = "$Registry/plus-ms-auth`:latest"; essential = $true; portMappings = @(@{ containerPort = 3001; hostPort = 3001; protocol = "tcp" }); environment = @(@{name="DB_HOST";value="postgres-auth.$NamespaceName"},@{name="DB_PORT";value="5432"},@{name="DB_USER";value="plus"},@{name="DB_PASSWORD";value="plus_secret"},@{name="DB_NAME";value="plus_auth"},@{name="JWT_SECRET";value=$JwtSecret},@{name="PORT";value="3001"}); logConfiguration = @{ logDriver="awslogs"; options=@{ "awslogs-group"="/ecs/$Project/plus-ms-auth"; "awslogs-region"=$Region; "awslogs-stream-prefix"="ecs" } } })
}

Upsert-Service "postgres-auth" $postgresTask $subnets $postgresSg $null "arn:aws:servicediscovery:$Region`:$AccountId`:service/$postgresSd"
Upsert-Service "plus-ms-estoque-fake" $stockTask $subnets $stockSg @{TargetGroupArn=$stockTg;ContainerName="plus-ms-estoque-fake";ContainerPort=3000} "arn:aws:servicediscovery:$Region`:$AccountId`:service/$stockSd"
Upsert-Service "plus-ms-auth" $authTask $subnets $authSg @{TargetGroupArn=$authTg;ContainerName="plus-ms-auth";ContainerPort=3001}


$updatedAlertsTask = Register-UpdatedTaskEnv "alertas-plus-ms-alerts" "plus-ms-alerts" @{
  JWT_SECRET = $JwtSecret
  ESTOQUE_API_URL = "http://estoque-fake.$NamespaceName`:3000"
  CORS_ORIGIN = "http://$($lb.DNSName)"
}
aws ecs update-service --cluster $Cluster --service plus-ms-alerts --task-definition $updatedAlertsTask --force-new-deployment --region $Region @NoVerify | Out-Null
aws ecs update-service --cluster $Cluster --service plus-mfe-alerts --force-new-deployment --region $Region @NoVerify | Out-Null
Write-Host "Deploy solicitado. Aguarde steady state:"
Write-Host "  aws ecs wait services-stable --cluster $Cluster --services postgres-auth plus-ms-auth plus-ms-estoque-fake plus-ms-alerts plus-mfe-alerts --region $Region --no-verify-ssl"
Write-Host "URLs publicas:"
Write-Host "  Auth:    http://$($lb.DNSName)/auth/login"
Write-Host "  Estoque: http://$($lb.DNSName)/estoque"
Write-Host "  Alerts:  http://$($lb.DNSName)/health"
Write-Host "  MFE:     http://$($lb.DNSName)/"


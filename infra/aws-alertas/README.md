# AWS Alertas

Infraestrutura AWS para o microservico de alertas, com tudo containerizado e MongoDB persistindo dados em EFS.

## O que cria

- VPC com duas subnets publicas.
- Application Load Balancer.
- ECS Fargate cluster.
- Service `plus-ms-alerts`.
- Service `plus-mfe-alerts`.
- Service `mongo-alertas` usando a imagem `mongo:7`.
- EFS criptografado montado no Mongo em `/data/db`.
- Cloud Map para o backend acessar `mongo-alertas.alertas.local`.
- CloudWatch Logs.
- SNS + SQS para notificacoes de alerta.

## Arquitetura

```text
ALB
|-- /, assets, remoteEntry.js -> plus-mfe-alerts:4002
|-- /alerta* e /health -------> plus-ms-alerts:3002
plus-ms-alerts
`-- mongodb://mongo-alertas.alertas.local:27017/api-alertas
mongo-alertas
`-- /data/db -> EFS
```

## Deploy manual

Publique as imagens Docker primeiro:

```text
docker.io/<usuario>/plus-ms-alerts:latest
docker.io/<usuario>/plus-mfe-alerts:latest
```

Depois:

```powershell
cd C:\Users\Usuario\Alertas\infra\aws-alertas
copy terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

Edite `terraform.tfvars` antes do apply.

## Variaveis importantes

| Variavel | Uso |
|---|---|
| `backend_image` | imagem Docker do `plus-ms-alerts` |
| `frontend_image` | imagem Docker do `plus-mfe-alerts` |
| `jwt_secret` | mesmo segredo usado pelo servico que emite JWT |
| `auth_api_url` | URL do servico de auth usado pelo frontend |

## Observacoes

O MongoDB roda em container, mas os dados nao ficam presos ao filesystem do container. Eles ficam no EFS montado em `/data/db`, entao sobrevivem a restart/recriacao da task.

Essa abordagem atende ao requisito de manter MongoDB containerizado e persistente na AWS. Para producao critica, um banco gerenciado continua sendo mais indicado.

# Guia de Execucao e Testes

## Plus — Modulo de Alertas

Este documento descreve o passo a passo para subir o ambiente, executar testes e validar manualmente o modulo de Alertas. Ele e separado do `README.md` para funcionar como roteiro operacional de execucao.

## 1. Pre-requisitos

| Ferramenta | Uso | Como verificar |
|---|---|---|
| Docker Desktop | Rodar bancos, backends e frontends em containers | `docker version` |
| Docker Compose | Orquestrar o ambiente local | `docker compose version` |
| Node.js 20+ | Rodar testes/build fora do Docker | `node -v` |
| npm | Instalar dependencias e executar scripts | `npm -v` |
| Git | Controle de versao | `git --version` |
| AWS CLI | Apenas para validar/deployar na AWS | `aws --version` |
| Navegador | Testar login e telas | Chrome, Edge ou Firefox |

No Windows, mantenha o Docker Desktop aberto antes de executar os comandos Docker.

## 2. Estrutura que precisa rodar

Para testar o fluxo completo de Alertas, estes componentes precisam estar ativos:

| Componente | Pasta / Servico | Porta local | Obrigatorio para |
|---|---|---:|---|
| Auth API | `plus-ms-auth` | `3001` | Login e emissao de JWT |
| Alerts API | `plus-ms-alerts` | `3002` | CRUD e monitoramento de alertas |
| MFE Auth | `plus-mfe-auth` | `4001` | Tela de login |
| MFE Alertas | `plus-mfe-alerts` | `4002` | Tela de alertas |
| Shell | `chave-shell` | `3000` | Integracao dos MFEs em uma rota unica |
| MongoDB Alertas | `mongo-alertas` | `27017` | Banco do `plus-ms-alerts` |
| PostgreSQL Auth | `postgres-auth` | `15432` | Banco do `plus-ms-auth` |
| Estoque fake | `plus-ms-estoque-fake` | `3004` | Simular saldo de estoque |

## 3. Subir tudo localmente com Docker Compose

Na raiz do projeto:

```powershell
docker compose up --build
```

Para rodar em segundo plano:

```powershell
docker compose up -d --build
```

Para acompanhar logs principais:

```powershell
docker compose logs -f plus-ms-auth plus-ms-alerts
```

Para parar:

```powershell
docker compose down
```

Para parar e apagar volumes locais dos bancos:

```powershell
docker compose down -v
```

Use `down -v` quando quiser reiniciar os bancos do zero. Isso apaga dados locais de MongoDB/PostgreSQL.

## 4. Validar health checks

Com o Compose rodando:

```powershell
Invoke-RestMethod http://localhost:3001/
Invoke-RestMethod http://localhost:3002/health
```

Com `curl`:

```bash
curl http://localhost:3001/
curl http://localhost:3002/health
```

Resultado esperado do Alerts API:

```json
{
  "status": "ok",
  "service": "plus-ms-alerts"
}
```

## 5. Login local

O Auth cria um usuario admin inicial automaticamente.

| Campo | Valor |
|---|---|
| E-mail | `admindev@admin.com` |
| Senha | `Senha123` |

PowerShell:

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3001/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"admindev@admin.com","password":"Senha123"}'

$token = $login.access_token
$token
```

Bash:

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admindev@admin.com","password":"Senha123"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "$TOKEN"
```

## 6. Testar API de Alertas manualmente

### 6.1 Listar configuracoes como admin

PowerShell:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3002/alerta `
  -Headers @{ Authorization = "Bearer $token" }
```

### 6.2 Criar configuracao de alerta

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3002/alerta `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"produtoId":"produto-001","roupaId":"roupa-001","produtoNome":"Camiseta","categoria":"Roupas","tamanho":"M","cor":"Azul","quantidadeMinima":10,"ativo":true}'
```

### 6.3 Listar alertas ativos

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3002/alerta/ativos `
  -Headers @{ Authorization = "Bearer $token" }
```

### 6.4 Disparar monitoramento manual

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3002/alerta/monitorar `
  -Headers @{ Authorization = "Bearer $token" }
```

## 7. Rodar estoque fake separado

Use isso quando quiser testar o `plus-ms-alerts` integrado a um servico de estoque simulado.

```powershell
cd plus-ms-estoque-fake
npm ci
npm start
```

O estoque fake sobe em:

```text
http://localhost:3000
```

Como a porta `3000` tambem e usada pelo Shell, em Docker recomenda-se expor o fake na porta `3004`:

```powershell
docker build -t plus-ms-estoque-fake ./plus-ms-estoque-fake
docker run --rm -p 3004:3000 plus-ms-estoque-fake
```

Configure o Alerts API para usar o estoque fake:

```powershell
$env:ESTOQUE_API_URL="http://localhost:3004"
```

Se o `plus-ms-alerts` estiver dentro do Docker Compose e o estoque fake estiver no host:

```powershell
$env:ESTOQUE_API_URL="http://host.docker.internal:3004"
docker compose up -d --build plus-ms-alerts
```

Endpoints uteis do estoque fake:

| Metodo | Path |
|---|---|
| `GET` | `/health` |
| `GET` | `/estoque` |
| `POST` | `/estoque` |
| `GET` | `/estoque/{roupaId}` |
| `GET` | `/estoque/produto/{produtoId}` |
| `POST` | `/estoque/entrada` |
| `POST` | `/estoque/saida` |
| `PATCH` | `/estoque/{roupaId}/ajuste` |

## 8. Testar as telas localmente

Com Docker Compose rodando:

| Tela | URL |
|---|---|
| Shell | http://localhost:3000 |
| Login direto | http://localhost:4001 |
| Alertas direto | http://localhost:4002 |
| Alertas via Shell | http://localhost:3000/alertas |

Fluxo esperado:

1. Abra `http://localhost:3000/login` ou `http://localhost:4001`.
2. Entre com `admindev@admin.com` e `Senha123`.
3. Apos login, acesse `http://localhost:3000/alertas`.
4. Crie uma configuracao de alerta como admin.
5. Execute o monitoramento manual ou aguarde o intervalo configurado.

## 9. Rodar testes automatizados do backend de Alertas

Na pasta `plus-ms-alerts`:

```powershell
cd plus-ms-alerts
npm ci
npm test
```

Suites separadas:

```powershell
npm run test:unit
npm run test:integration
npm run test:contract
npm run test:functional
npm run coverage
```

Cobertura minima esperada:

| Metrica | Minimo |
|---|---:|
| Statements | 85% |
| Branches | 80% |
| Functions | 85% |
| Lines | 85% |

## 10. Rodar typecheck e build dos MFEs

### MFE Alertas

```powershell
cd plus-mfe-alerts
npm ci
npm run typecheck
npm run build
```

### MFE Auth

```powershell
cd plus-mfe-auth
npm ci
npm run typecheck
npm run build
```

O build dos MFEs executa TypeScript antes de gerar o bundle Vite.

## 11. Ambiente de teste com LocalStack

Use quando quiser testar mensageria SNS/SQS sem usar AWS real.

Na raiz:

```powershell
docker compose -f docker-compose.test.yml up -d --build
```

Servicos:

| Servico | URL |
|---|---|
| LocalStack | http://localhost:4566 |
| Estoque fake | http://localhost:3004 |
| Alerts API teste | http://localhost:3005 |

Validacao rapida:

```powershell
Invoke-RestMethod http://localhost:4566/_localstack/health
Invoke-RestMethod http://localhost:3004/health
Invoke-RestMethod http://localhost:3005/health
```

Para parar e limpar:

```powershell
docker compose -f docker-compose.test.yml down -v
```

## 12. Validar deploy AWS atual

URL publica atual:

```text
http://alertas-alb-308081830.us-east-1.elb.amazonaws.com
```

Rotas principais:

| Rota | Esperado |
|---|---|
| `/login` | Tela de login |
| `/auth/login` | API de login |
| `/alertas` | Tela de alertas |
| `/health` | Health do `plus-ms-alerts` |
| `/alerta` | API de configuracoes de alerta |

Teste de login na AWS com `curl`:

```powershell
curl.exe --noproxy "*" -i `
  -X POST http://alertas-alb-308081830.us-east-1.elb.amazonaws.com/auth/login `
  -H "Content-Type: application/json" `
  --data-raw '{"email":"admindev@admin.com","password":"Senha123"}'
```

Teste da API de alertas com token:

```powershell
$loginJson = curl.exe --noproxy "*" -s `
  -X POST http://alertas-alb-308081830.us-east-1.elb.amazonaws.com/auth/login `
  -H "Content-Type: application/json" `
  --data-raw '{"email":"admindev@admin.com","password":"Senha123"}'

$login = $loginJson | ConvertFrom-Json

curl.exe --noproxy "*" -i `
  http://alertas-alb-308081830.us-east-1.elb.amazonaws.com/alerta `
  -H "Authorization: Bearer $($login.access_token)"
```

## 13. Deploy AWS manual dos containers

Use apenas quando precisar publicar nova imagem.

### 13.1 Login AWS

```powershell
aws login --no-verify-ssl
```

### 13.2 Login no ECR

```powershell
aws ecr get-login-password --region us-east-1 --no-verify-ssl |
  docker login --username AWS --password-stdin 631412642179.dkr.ecr.us-east-1.amazonaws.com
```

### 13.3 Build e push do MFE Alertas

```powershell
docker build `
  --build-arg VITE_MS_AUTH_URL=http://alertas-alb-308081830.us-east-1.elb.amazonaws.com `
  --build-arg VITE_MS_ALERTS_URL=http://alertas-alb-308081830.us-east-1.elb.amazonaws.com `
  -t 631412642179.dkr.ecr.us-east-1.amazonaws.com/plus-mfe-alerts:latest `
  ./plus-mfe-alerts

docker push 631412642179.dkr.ecr.us-east-1.amazonaws.com/plus-mfe-alerts:latest

aws ecs update-service `
  --cluster alertas-cluster `
  --service plus-mfe-alerts `
  --force-new-deployment `
  --region us-east-1 `
  --no-verify-ssl
```

### 13.4 Build e push do MFE Auth

```powershell
docker build `
  --build-arg VITE_MS_AUTH_URL=http://alertas-alb-308081830.us-east-1.elb.amazonaws.com `
  --build-arg VITE_MS_ALERTS_URL=http://alertas-alb-308081830.us-east-1.elb.amazonaws.com `
  -t 631412642179.dkr.ecr.us-east-1.amazonaws.com/plus-mfe-auth:latest `
  ./plus-mfe-auth

docker push 631412642179.dkr.ecr.us-east-1.amazonaws.com/plus-mfe-auth:latest

aws ecs update-service `
  --cluster alertas-cluster `
  --service plus-mfe-auth `
  --force-new-deployment `
  --region us-east-1 `
  --no-verify-ssl
```

### 13.5 Build e push do MS Alertas

```powershell
docker build `
  -t 631412642179.dkr.ecr.us-east-1.amazonaws.com/plus-ms-alerts:latest `
  ./plus-ms-alerts

docker push 631412642179.dkr.ecr.us-east-1.amazonaws.com/plus-ms-alerts:latest

aws ecs update-service `
  --cluster alertas-cluster `
  --service plus-ms-alerts `
  --force-new-deployment `
  --region us-east-1 `
  --no-verify-ssl
```

### 13.6 Build e push do MS Auth

```powershell
docker build `
  -t 631412642179.dkr.ecr.us-east-1.amazonaws.com/plus-ms-auth:latest `
  ./plus-ms-auth

docker push 631412642179.dkr.ecr.us-east-1.amazonaws.com/plus-ms-auth:latest

aws ecs update-service `
  --cluster alertas-cluster `
  --service plus-ms-auth `
  --force-new-deployment `
  --region us-east-1 `
  --no-verify-ssl
```

## 14. Checklist de validacao final

Antes de considerar a entrega pronta, valide:

| Item | Comando / Acao | Resultado esperado |
|---|---|---|
| Auth local | `POST /auth/login` | Retorna `access_token` |
| Alerts local | `GET /health` | Retorna `status: ok` |
| Alertas com token | `GET /alerta` | Retorna `200 OK` |
| MFE login | Abrir `/login` | Mostra tela de login |
| MFE alertas | Abrir `/alertas` | Mostra tela de alertas |
| Asset Auth AWS | `GET /auth-ui/assets/*.js` | `Content-Type: text/javascript` |
| Asset Alertas AWS | `GET /assets/*.js` | `Content-Type: text/javascript` |
| Testes backend | `npm test` em `plus-ms-alerts` | Suites passam |
| Cobertura | `npm run coverage` | Acima dos minimos |
| Docker Compose | `docker compose up --build` | Todos servicos sobem |

## 15. Problemas comuns

| Sintoma | Causa provavel | Como resolver |
|---|---|---|
| Docker nao conecta | Docker Desktop fechado | Abrir Docker Desktop e repetir `docker version` |
| `/login` mostra Alertas | Regra do ALB ou build antigo | Conferir rota `/login` para `plus-mfe-auth` e redeployar MFE Auth |
| Pagina recarrega sem parar | Asset JS servido como HTML | Validar `/auth-ui/assets/*.js` ou `/assets/*.js` com `curl -I` |
| `401 Not authenticated` | Token ausente | Fazer login e enviar `Authorization: Bearer <token>` |
| `403` em rota admin | Usuario sem role admin | Usar `admindev@admin.com` ou promover usuario |
| `CannotPullContainerError` no ECS | Imagem nao existe no ECR | Fazer `docker push` da imagem esperada |
| AWS CLI falha em `signin.aws.amazon.com` | Sessao expirada ou CA local | Rodar `aws login --no-verify-ssl` novamente |
| `127.0.0.1:9` em chamadas HTTP | Proxy local do ambiente | Usar `curl.exe --noproxy "*"` |
| Mongo indisponivel | Container/banco nao subiu | Ver `docker compose logs mongo-alertas plus-ms-alerts` |
| Estoque nao responde | `ESTOQUE_API_URL` incorreta | Ajustar URL para `localhost`, `host.docker.internal` ou endpoint AWS |

## 16. Ordem recomendada para uma demonstracao

1. Subir o ambiente: `docker compose up -d --build`.
2. Validar health: Auth e Alerts.
3. Fazer login com `admindev@admin.com` / `Senha123`.
4. Abrir a tela de alertas.
5. Criar configuracao de alerta para `produto-001` / `roupa-001`.
6. Rodar estoque fake e simular saldo baixo.
7. Executar `POST /alerta/monitorar`.
8. Mostrar alerta ativo na UI.
9. Rodar `npm test` no `plus-ms-alerts`.
10. Mostrar AWS publica em `/login`, `/alertas`, `/health` e `/alerta` com token.

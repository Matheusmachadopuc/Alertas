# Workspace Chave / Alertas

Este workspace agrupa servicos separados. Cada pasta deve manter apenas a responsabilidade do proprio servico.

## Pastas

| Pasta | Responsabilidade |
|---|---|
| `chave-infra` | Orquestracao Docker, Ministack e Terraform |
| `chave-shell` | Shell host dos microfrontends |
| `plus-mfe-auth` | Microfrontend de autenticacao e telas de usuario |
| `plus-mfe-alerts` | Microfrontend de alertas de estoque |
| `plus-ms-auth` | Microservico backend de autenticacao |
| `plus-ms-alerts` | Microservico backend de alertas |
| `DocSwagger` | Documentacao Swagger legada da API de alertas |

## Portas

| Servico | Porta |
|---|---|
| `chave-shell` | `3000` |
| `plus-ms-auth` | `3001` |
| `plus-ms-alerts` | `3002` |
| `plus-mfe-auth` | `4001` |
| `plus-mfe-alerts` | `4002` |
| `mongo-alertas` | `27017` |
| `postgres-auth` | `15432` |

## Como subir tudo

Use o Compose da raiz para subir os backends, bancos e front:

```powershell
docker compose up --build
```

Para rodar em segundo plano:

```powershell
docker compose up -d --build
```

Para ver logs:

```powershell
docker compose logs -f plus-ms-auth plus-ms-alerts
```

Para parar:

```powershell
docker compose down
```

Se quiser apagar tambem os dados locais dos bancos:

```powershell
docker compose down -v
```

## Autenticacao e alertas

O `plus-ms-alerts` nao faz login. Ele recebe o JWT emitido pelo servico de auth em:

```http
Authorization: Bearer <token>
```

Regras:

- usuario autenticado pode executar `GET /alerta/ativos`;
- apenas admin pode executar `GET /alerta`, `POST /alerta`, `PATCH /alerta/{id}`, `DELETE /alerta/{id}` e `POST /alerta/monitorar`;
- `JWT_SECRET` deve ser o mesmo no servico de auth e no `plus-ms-alerts`.

## Como testar a API do backend

Depois de subir com `docker compose up --build`, teste os health checks:

**PowerShell:**
```powershell
Invoke-RestMethod http://localhost:3001/
Invoke-RestMethod http://localhost:3002/health
```

**Linux / Bash:**
```bash
curl http://localhost:3001/
curl http://localhost:3002/health
```

O `plus-ms-auth` cria um usuario admin inicial automaticamente:

| Campo | Valor |
|---|---|
| email | `admindev@admin.com` |
| senha | `Senha123` |

Faca login e guarde o access token:

**PowerShell:**
```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3001/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"admindev@admin.com","password":"Senha123"}'

$token = $login.access_token
```

**Linux / Bash:**
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admindev@admin.com","password":"Senha123"}' | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
```

Crie uma configuracao de alerta de estoque:

**PowerShell:**
```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3002/alerta `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"produtoId":"uuid-do-produto","roupaId":"uuid-da-roupa","produtoNome":"Camiseta","categoria":"Roupas","tamanho":"M","cor":"Azul","quantidadeMinima":10,"ativo":true}'
```

**Linux / Bash:**
```bash
curl -X POST http://localhost:3002/alerta \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"produtoId":"uuid-do-produto","roupaId":"uuid-da-roupa","produtoNome":"Camiseta","categoria":"Roupas","tamanho":"M","cor":"Azul","quantidadeMinima":10,"ativo":true}'
```

Liste as configuracoes de alertas como admin:

**PowerShell:**
```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3002/alerta `
  -Headers @{ Authorization = "Bearer $token" }
```

**Linux / Bash:**
```bash
curl http://localhost:3002/alerta \
  -H "Authorization: Bearer $TOKEN"
```

Liste os alertas ativos que qualquer usuario autenticado pode ver:

**PowerShell:**
```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3002/alerta/ativos `
  -Headers @{ Authorization = "Bearer $token" }
```

**Linux / Bash:**
```bash
curl http://localhost:3002/alerta/ativos \
  -H "Authorization: Bearer $TOKEN"
```

A interface fica em:

| Servico | URL |
|---|---|
| Shell | http://localhost:3000 |
| MFE Auth | http://localhost:4001 |
| MFE Alertas | http://localhost:4002 |
| Auth API | http://localhost:3001 |
| Alerts API | http://localhost:3002 |

O Compose antigo com Ministack/Terraform continua em `chave-infra/docker-compose.yml` para quando for necessario testar esse ambiente especifico.

## Alertas integrados ao MS4 Estoque

O `plus-ms-alerts` monitora o MS4 Estoque a cada minuto. Configure a URL do estoque com:

**PowerShell:**
```powershell
$env:ESTOQUE_API_URL="http://host.docker.internal:3004"
docker compose up -d --build
```

**Linux / Bash:**
```bash
export ESTOQUE_API_URL="http://host.docker.internal:3004"
docker compose up -d --build
```

Como o shell deste workspace usa a porta `3000`, rode o MS4 Estoque em outra porta no host:

```bash
docker run -p 3004:3000 plus-ms-estoque
```

Se o `plus-ms-alerts` estiver rodando fora do Docker e o MS4 Estoque estiver na porta padrao da documentacao:

**PowerShell:**
```powershell
$env:ESTOQUE_API_URL="http://localhost:3000"
npm start
```

**Linux / Bash:**
```bash
export ESTOQUE_API_URL="http://localhost:3000"
npm start
```

Endpoints principais de alertas:

| Metodo | Path | Permissao |
|---|---|---|
| `GET` | `/alerta/ativos` | usuario autenticado |
| `GET` | `/alerta` | admin |
| `POST` | `/alerta` | admin |
| `PATCH` | `/alerta/{id}` | admin |
| `DELETE` | `/alerta/{id}` | admin |
| `POST` | `/alerta/monitorar` | admin |

Exemplo de configuracao de limiar:

**PowerShell:**
```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3002/alerta `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"produtoId":"uuid-do-produto","roupaId":"uuid-da-roupa","produtoNome":"Camiseta","categoria":"Roupas","tamanho":"M","cor":"Azul","quantidadeMinima":10,"ativo":true}'
```

**Linux / Bash:**
```bash
curl -X POST http://localhost:3002/alerta \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"produtoId":"uuid-do-produto","roupaId":"uuid-da-roupa","produtoNome":"Camiseta","categoria":"Roupas","tamanho":"M","cor":"Azul","quantidadeMinima":10,"ativo":true}'
```

O front de alertas fica em `http://localhost:3000/alertas` pelo shell. Admin gerencia limiares; usuario comum ve apenas alertas ativos.

## Testes, cobertura e estoque fake

O `plus-ms-alerts` possui testes unitarios, integracao, contrato e funcionais. Rode:

```powershell
cd plus-ms-alerts
npm test
npm run test:unit
npm run test:integration
npm run test:contract
npm run test:functional
npm run coverage
```

A cobertura minima configurada em `plus-ms-alerts/jest.config.js` e:

| Metrica | Minimo |
|---|---:|
| statements | `85%` |
| branches | `80%` |
| functions | `85%` |
| lines | `85%` |

O ultimo resultado local ficou acima do minimo:

| Metrica | Resultado |
|---|---:|
| statements | `92.45%` |
| branches | `81.53%` |
| functions | `94.54%` |
| lines | `92.74%` |

Para rodar o estoque ficticio de testes:

**PowerShell / Windows:**
```powershell
cd C:\Users\Usuario\Alertas\plus-ms-estoque-fake
npm ci
npm start
```

**Linux / Bash:**
```bash
cd ~/Alertas/plus-ms-estoque-fake
npm ci
npm start
```

Ou via Docker:

```powershell
docker build -t plus-ms-estoque-fake ./plus-ms-estoque-fake
docker run -p 3004:3000 plus-ms-estoque-fake
```

Endpoints do estoque fake:

| Metodo | Path |
|---|---|
| `GET` | `/health` |
| `POST` | `/estoque` |
| `GET` | `/estoque` |
| `GET` | `/estoque/produto/:produtoId` |
| `GET` | `/estoque/:roupaId` |
| `POST` | `/estoque/entrada` |
| `POST` | `/estoque/saida` |
| `PATCH` | `/estoque/:roupaId/ajuste` |
| `GET` | `/estoque/:roupaId/movimentos` |

## Ambiente de teste com LocalStack

Para subir um ambiente reproduzivel com LocalStack, Mongo de teste, `plus-ms-alerts-test` e estoque fake:

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

**PowerShell:**
```powershell
Invoke-RestMethod http://localhost:4566/_localstack/health
Invoke-RestMethod http://localhost:3004/health
Invoke-RestMethod http://localhost:3005/health
```

**Linux / Bash:**
```bash
curl http://localhost:4566/_localstack/health
curl http://localhost:3004/health
curl http://localhost:3005/health
```

Para derrubar e limpar volumes:

```powershell
docker compose -f docker-compose.test.yml down -v
```

## Pipeline e releases

Os workflows ficam em:

| Workflow | Finalidade |
|---|---|
| `.github/workflows/ci.yml` | testes, cobertura, builds frontend, Docker build e smoke do compose LocalStack |
| `.github/workflows/release.yml` | publicacao no Docker Hub e NPM em tags `v*.*.*` ou manual |

Secrets esperados para release:

| Secret | Uso |
|---|---|
| `DOCKERHUB_USERNAME` | namespace/login Docker Hub |
| `DOCKERHUB_TOKEN` | token de publicacao Docker Hub |
| `NPM_TOKEN` | token de publicacao NPM |

Imagens Docker publicadas quando os secrets existem:

```text
<DOCKERHUB_USERNAME>/plus-ms-alerts
<DOCKERHUB_USERNAME>/plus-mfe-alerts
<DOCKERHUB_USERNAME>/plus-ms-estoque-fake
<DOCKERHUB_USERNAME>/plus-ms-auth
```

Pacotes NPM publicados quando `NPM_TOKEN` existe:

```text
plus-ms-alerts
plus-mfe-alerts
plus-ms-estoque-fake
```

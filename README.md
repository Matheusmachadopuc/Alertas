# Workspace Chave / Alertas

Este workspace agrupa servicos separados. Cada pasta deve manter apenas a responsabilidade do proprio servico.

## Pastas

| Pasta | Responsabilidade |
|---|---|
| `chave-infra` | Orquestracao Docker, Ministack e Terraform |
| `chave-shell` | Shell host dos microfrontends |
| `plus-mfe-auth` | Microfrontend de autenticacao e telas de usuario |
| `plus-ms-alerts` | Microservico backend de alertas |
| `DocSwagger` | Documentacao Swagger legada da API de alertas |

## Portas

| Servico | Porta |
|---|---|
| `chave-shell` | `3000` |
| `chave-ms-auth` | `3001` |
| `plus-ms-alerts` | `3002` |
| `plus-mfe-auth` | `4001` |
| `mongo-alertas` | `27017` |
| `ministack` | `4566` |

## Como subir tudo

Use a infraestrutura como fonte de verdade:

```powershell
cd chave-infra
Copy-Item .env.example .env
docker compose up --build
```

O arquivo `docker-compose.yml` da raiz apenas inclui o Compose de `chave-infra`.

## Autenticacao e alertas

O `plus-ms-alerts` nao faz login. Ele recebe o JWT emitido pelo servico de auth em:

```http
Authorization: Bearer <token>
```

Regras:

- usuario autenticado pode executar `GET /alerta`;
- apenas admin pode executar `POST /alerta`, `PATCH /alerta/{id}` e `DELETE /alerta/{id}`;
- `JWT_SECRET` deve ser o mesmo no servico de auth e no `plus-ms-alerts`.

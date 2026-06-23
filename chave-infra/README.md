# chave-infra

Infraestrutura local do projeto Chave. Este Compose e a fonte de verdade para subir shell, microfrontends, microsservicos, MongoDB de alertas e Ministack.

## Estrutura esperada

As pastas devem ficar lado a lado:

```text
Alertas/
  chave-infra/
  chave-shell/
  plus-mfe-auth/
  plus-ms-alerts/
  chave-ms-auth/        # backend de autenticacao, necessario para login/JWT
```

## Portas

| Servico | Porta | Responsabilidade |
|---|---:|---|
| `chave-shell` | `3000` | host dos microfrontends |
| `chave-ms-auth` | `3001` | login, usuarios e emissao de JWT |
| `plus-ms-alerts` | `3002` | CRUD de alertas e autorizacao por role |
| `plus-mfe-auth` | `4001` | telas remotas de login/cadastro/dashboard |
| `mongo-alertas` | `27017` | banco do microservico de alertas |
| `ministack` | `4566` | stack AWS local |

## Subir localmente

```bash
cp .env.example .env
docker compose up --build
```

Ou usando Make:

```bash
make setup
```

## Comunicacao entre servicos

- O shell carrega o remote do `plus-mfe-auth` em `http://localhost:4001/assets/remoteEntry.js`.
- O `plus-mfe-auth` chama o auth backend em `http://localhost:3001`.
- O `plus-ms-alerts` fica em `http://localhost:3002`.
- O browser deve enviar para Alertas o token emitido pelo auth:

```http
Authorization: Bearer <token>
```

## Autorizacao dos alertas

O `plus-ms-alerts` nao faz login e nao conhece senha. Ele apenas valida o JWT usando o mesmo `JWT_SECRET` do `chave-ms-auth`.

- `GET /alerta`: usuario autenticado.
- `POST /alerta`: admin.
- `PATCH /alerta/{id}`: admin.
- `DELETE /alerta/{id}`: admin.

As roles de admin sao configuradas em `ALERTS_ADMIN_ROLES`.

## Observacao

Este workspace atual contem `plus-mfe-auth` e `plus-ms-alerts`, mas o backend `chave-ms-auth` precisa estar presente para o login funcionar e para emitir tokens reais.

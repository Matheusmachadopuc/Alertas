# Engenharia_Software_II_Swagger_Alertas


## Tecnologias Utilizadas

- Node.js
- Express
- Swagger UI
- Swagger JSDoc
- UUID

---

## Endpoints da API

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/alerta` | Lista todos os alertas cadastrados |
| POST | `/alerta` | Cria um novo alerta |
| PATCH | `/alerta/{id}` | Atualiza parcialmente um alerta existente |
| DELETE | `/alerta/{id}` | Remove um alerta pelo ID |

## Como usar
- Entre na pasta:

  ``` cd DocSwagger ```
- Execute:

  ``` node documentacao.js ```

- Abra a porta:

  ``` http://localhost:3000/docs ```
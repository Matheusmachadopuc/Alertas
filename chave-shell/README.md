# chave-shell

Shell App do projeto **Chave** — microfrontend host.

Orquestra os microfrontends remotos via **Module Federation**, consumindo o `chave-mfe-auth` para renderizar as rotas de autenticação. Construído com React + Vite.

---

## Tecnologias

- React 18 + React Router DOM 6
- Vite 5
- `@originjs/vite-plugin-federation` — Module Federation
- `@vitejs/plugin-react`

---

## Module Federation

Este app atua como **host**, consumindo os seguintes remotos:

| Remote | URL padrão |
|---|---|
| `mfe_auth` | `http://localhost:4001/assets/remoteEntry.js` |

A URL do remote pode ser sobrescrita via variável de ambiente em build time:

| Variável | Descrição |
|---|---|
| `MFE_AUTH_URL` | URL do `remoteEntry.js` do `chave-mfe-auth` |

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia em modo desenvolvimento na porta 3000 |
| `npm run build` | Gera o bundle em `dist/` |
| `npm run preview` | Serve o build na porta 3000 |

---

## Desenvolvimento local (sem Docker)

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

> O `chave-mfe-auth` precisa estar rodando em `http://localhost:4001` para que o remote seja carregado corretamente.

---

## Executando com a stack completa

Este serviço é orquestrado pelo `chave-infra`. Consulte o [README do chave-infra](https://github.com/pucrs-sweii-2026-1-30/chave-infra).

# Manual UI - Plus MFE Alertas

Este manual registra o padrao visual e de interacao da tela de alertas.

## Identidade

- Produto: Alertas de Estoque.
- Usuario principal: administrador que configura limiares e operador que acompanha alertas ativos.
- Tom: operacional, direto e consistente com o Plus Gestao.

## Layout

- A tela principal deve abrir direto no fluxo de trabalho de alertas.
- O cabecalho mostra titulo, usuario autenticado e acoes globais.
- Filtros ficam acima das tabelas para reduzir tempo de busca.
- Alertas ativos e configuracoes ficam em secoes separadas.
- Em telas pequenas, campos e botoes devem quebrar linha sem sobrepor conteudo.

## Componentes

- Use `Button` com icone para acoes claras: atualizar, monitorar, novo alerta e sair.
- Use `IconButton` com tooltip para acoes repetidas em tabela: editar e excluir.
- Use `Chip` para status e contadores.
- Use `Snackbar` para retorno de operacoes de criacao, edicao, exclusao e monitoramento.
- Use `Dialog` para criacao e edicao de configuracao de alerta.

## Estados

- Loading inicial deve bloquear a tela com indicador central.
- Lista vazia deve informar ausencia de alertas sem parecer erro.
- Status `ATIVO` usa cor de erro.
- Status `ERRO` usa cor de aviso.
- Status `OK` usa cor de sucesso.
- Configuracao inativa deve aparecer como `INATIVO`.

## Regras de acesso

- Administrador pode listar, criar, editar, excluir e executar monitoramento manual.
- Usuario comum ve apenas alertas ativos.
- Falha 401 remove tokens locais e volta para login.

## Tipagem

- Todo codigo em `src` deve passar em `npm run typecheck`.
- Nao usar `any` para modelos de API; atualize `src/types.ts` quando a API mudar.
- `AlertaFormValues` representa o formulario, e `AlertaEstoque` representa a resposta da API.

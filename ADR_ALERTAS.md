# ADR — Documento de Decisao de Arquitetura
## Plus — Modulo de Alertas de Estoque para Loja de Roupas Plus Size

| Campo | Valor |
|---|---|
| Projeto | Plus — Sistema de gestao de estoque para loja de roupas plus size |
| Modulo / Bounded Context | Alertas de Estoque por produto, roupa, grade, cor e tamanho |
| Disciplina | Engenharia de Software II — 98802-02 |
| Turma | 30 — PUCRS / 2026-1 |
| Professor | Prof. Jose Pedro Schardosim Simao |
| Parceiro | Josiel Pereira — Ararangua/SC |
| Responsabilidade documentada | `plus-ms-alerts`, `plus-mfe-alerts`, banco de alertas e integracoes necessarias |
| Versao / Data | v1.0 — Junho de 2026 |
| Status | Aceita |
| Decisao principal | Microsservico de Alertas + Microfrontend de Alertas, com persistencia propria em MongoDB e integracao com Auth, Estoque e mensageria AWS |

## 1. Contexto e Problema

O sistema Plus atende uma loja de roupas plus size, onde a gestao de estoque precisa considerar variacoes de produto por grade, tamanho, cor e identificador de roupa. Nesse dominio, a falta de uma numeracao especifica pode impactar diretamente a venda: uma peca pode existir no catalogo, mas estar indisponivel em uma grade critica para o publico atendido.

O modulo de Alertas resolve esse problema monitorando saldos de estoque e permitindo que usuarios administradores configurem limiares minimos por produto, roupa, categoria, tamanho e cor. Quando o saldo consultado no servico de estoque fica igual ou abaixo do limite configurado, o alerta passa a aparecer como ativo para acompanhamento operacional.

Este ADR documenta as decisoes arquiteturais do recorte de Alertas, incluindo frontend, backend, banco de dados, autenticacao, comunicacao com estoque, mensageria, infraestrutura AWS, ambiente local e trade-offs. O foco nao e documentar toda a plataforma Plus, mas sim justificar tecnicamente como o modulo de Alertas se encaixa no ecossistema.

### 1.1 Forcas arquiteturais consideradas

| Forca | Impacto no modulo de Alertas |
|---|---|
| Independencia de deploy | Alertas deve poder evoluir sem recompilar todo o sistema de estoque |
| Consistencia operacional | Configuracoes de alerta precisam sobreviver a restart de container e troca de task |
| Integracao com Auth | Permissoes diferenciam usuario autenticado e administrador |
| Integracao com Estoque | Alertas depende de saldo atualizado por produto/roupa/grade |
| Baixo acoplamento | O modulo nao deve conhecer senha, cadastro de usuario nem regras internas do estoque |
| Observabilidade | Falhas de monitoramento e notificacao precisam ser rastreaveis em logs |
| Custo e simplicidade academica | A solucao deve caber em ambiente AWS de demonstracao e em execucao local via Docker |
| Evolucao futura | Deve permitir troca de estoque fake pelo MS4 Estoque real sem reescrever o dominio de alertas |

## 2. Decisao Arquitetural

Adotar um modulo independente de Alertas composto por:

| Unidade | Implementacao | Responsabilidade |
|---|---|---|
| `plus-mfe-alerts` | React + TypeScript + Vite + MUI + Module Federation | Interface para visualizar alertas ativos e administrar configuracoes de limiar |
| `plus-ms-alerts` | Node.js + Express + Mongoose | API REST de configuracao, listagem e monitoramento de alertas |
| `mongo-alertas` | MongoDB 7 containerizado | Persistencia das configuracoes e estado dos alertas |
| EFS para MongoDB | Amazon EFS criptografado | Persistencia de dados do Mongo mesmo quando a task Fargate reinicia |
| Auth externo ao contexto | `plus-ms-auth` + JWT | Emissao de token e RBAC consumidos pelo MS de Alertas |
| Estoque externo ao contexto | MS4 Estoque ou `plus-ms-estoque-fake` | Fonte de saldo por roupa/produto usada pelo monitoramento |
| Notificacao | SNS + SQS | Publicacao de evento quando um alerta cruza o limiar de estoque |
| Infraestrutura | ECS Fargate + ALB + ECR + Cloud Map + CloudWatch | Execucao publica, roteamento, imagens, descoberta interna e logs |

A decisao central e manter Alertas como bounded context proprio, com banco proprio e API propria, mas sem duplicar responsabilidades de autenticacao ou estoque. O servico de Alertas valida o JWT recebido, aplica permissoes por role e consulta o servico de estoque por API REST quando precisa calcular saldo.

## 3. Escopo do Modulo de Alertas

### 3.1 Responsabilidades aceitas

| Responsabilidade | Justificativa |
|---|---|
| Cadastrar configuracoes de alerta | Administradores precisam definir limiares por produto/grade |
| Listar configuracoes | Administradores precisam auditar todos os limiares ativos e inativos |
| Listar alertas ativos | Usuarios autenticados precisam visualizar itens em risco operacional |
| Monitorar estoque | O modulo precisa consultar saldo periodicamente e atualizar status |
| Publicar notificacoes | Eventos de baixo estoque podem alimentar filas, dashboards ou notificadores |
| Validar JWT e RBAC | O modulo deve proteger operacoes administrativas sem depender de sessao no servidor |
| Persistir historico minimo de estado | Ultimo saldo, status e ultima verificacao sao parte do dominio de alerta |

### 3.2 Responsabilidades explicitamente fora do escopo

| Fora do escopo | Servico responsavel | Motivo |
|---|---|---|
| Login, senha e cadastro de usuario | `plus-ms-auth` | Evita duplicacao de identidade e reduz risco de seguranca |
| Saldo real de estoque | MS4 Estoque | Estoque e dono da verdade para movimentos e saldos |
| Cadastro completo de produto | MS Produto / Catalogo | Alertas armazena apenas dados necessarios para exibir e filtrar alertas |
| Envio final de e-mail, WhatsApp ou push | Consumidor de SNS/SQS | Alertas publica evento, mas nao acopla canal de comunicacao |
| Pagamentos, pedidos e vendas | MS Pedidos | Alertas apenas reage ao saldo resultante |

## 4. Mapeamento dos Componentes

| Componente | Porta local | Porta container | Deploy AWS | Banco / Estado | Observacoes |
|---|---:|---:|---|---|---|
| `plus-mfe-alerts` | `4002` | `4002` | ECS Fargate atras do ALB | Stateless | Build Vite servido por `vite preview`; exposto em `/alertas` e rota default de demonstracao |
| `plus-ms-alerts` | `3002` | `3002` | ECS Fargate atras do ALB | MongoDB | API REST protegida por JWT |
| `mongo-alertas` | `27017` | `27017` | ECS Fargate interno | EFS montado em `/data/db` | Banco proprio do contexto de Alertas |
| `plus-ms-auth` | `3001` | `3001` | ECS Fargate atras do ALB | PostgreSQL | Dependencia para emissao de JWT |
| `postgres-auth` | `15432` local | `5432` | ECS Fargate interno | Volume/container demo | Banco relacional da autenticacao |
| `plus-ms-estoque-fake` | `3004` local | `3000` | Opcional para demo/teste | Memoria | Simula MS4 Estoque em testes e demonstracao |
| SNS/SQS | LocalStack em teste | AWS gerenciado | AWS | Mensagens | Eventos de notificacao de alertas |

## 5. Visao da Arquitetura

### 5.1 Fluxo principal em producao/demonstracao AWS

```text
Browser
  |
  | GET /login
  v
Application Load Balancer
  |-- /login, /register, /success, /auth-ui/* -> plus-mfe-auth:4001
  |-- /auth, /auth/* -------------------------> plus-ms-auth:3001
  |-- /alerta, /alerta/*, /health ------------> plus-ms-alerts:3002
  |-- /alertas e demais rotas ----------------> plus-mfe-alerts:4002

plus-mfe-auth
  |-- POST /auth/login
  v
plus-ms-auth
  |-- consulta usuarios/roles
  v
postgres-auth

plus-mfe-alerts
  |-- Authorization: Bearer <JWT>
  v
plus-ms-alerts
  |-- valida JWT e role
  |-- persiste configuracoes
  |-- consulta saldo
  |-- publica notificacao
  v
mongo-alertas + MS Estoque/Estoque Fake + SNS/SQS
```

### 5.2 Fluxo de login e autorizacao

1. O usuario acessa `/login` pelo ALB.
2. O `plus-mfe-auth` renderiza a tela de login e envia `POST /auth/login`.
3. O `plus-ms-auth` valida usuario e senha no PostgreSQL.
4. Em caso de sucesso, o auth retorna `access_token` e `refresh_token` JWT.
5. O token e salvo no navegador e usado pelo `plus-mfe-alerts` nas chamadas para `/alerta`.
6. O `plus-ms-alerts` valida assinatura e claims do JWT usando o mesmo `JWT_SECRET` configurado no auth.
7. Rotas administrativas exigem role de administrador; usuarios autenticados podem consultar alertas ativos.

Credencial inicial de demonstracao:

| Campo | Valor |
|---|---|
| E-mail | `admindev@admin.com` |
| Senha | `Senha123` |
| Role | `admin` |

### 5.3 Fluxo de configuracao de alerta

1. Administrador autenticado acessa `/alertas`.
2. O MFE chama `GET /auth/me` para identificar usuario e role.
3. O MFE chama `GET /alerta` para listar configuracoes existentes.
4. Ao criar ou editar um alerta, o MFE envia os dados para `POST /alerta` ou `PATCH /alerta/{id}`.
5. O backend valida payload, role e regras minimas do dominio.
6. O documento e persistido no MongoDB do contexto de Alertas.

### 5.4 Fluxo de monitoramento de estoque

```text
Scheduler interno do plus-ms-alerts
  |
  | a cada ALERTS_MONITOR_INTERVAL_MS
  v
Busca configuracoes ativas no MongoDB
  |
  | para cada alerta
  v
Consulta MS Estoque por roupaId ou produtoId/tamanho/cor
  |
  | compara saldo <= quantidadeMinima
  v
Atualiza status, ultimoSaldo e ultimaVerificacaoEm
  |
  | se cruzou limiar
  v
Publica evento SNS para topico de alertas
  |
  v
SQS recebe evento para consumidores futuros
```

## 6. Bancos de Dados e Persistencia

### 6.1 Banco de Alertas — MongoDB

Foi adotado MongoDB para o `plus-ms-alerts` porque o agregado de alerta tem natureza documental e pode evoluir sem migracoes relacionais frequentes. A configuracao de alerta possui campos opcionais como `roupaId`, `produtoId`, `produtoNome`, `categoria`, `tamanho`, `cor`, `quantidadeMinima`, `ativo`, `status`, `ultimoSaldo` e `ultimaVerificacaoEm`. Nem todos os alertas usam a mesma granularidade: alguns monitoram uma roupa especifica; outros monitoram uma combinacao de produto, tamanho e cor.

| Decisao | Justificativa |
|---|---|
| MongoDB como banco do contexto de Alertas | Flexibilidade para documentos com filtros opcionais e estado operacional do alerta |
| Mongoose no backend | Define schema, validacoes e facilita testes com modelos isolados |
| Database-per-service | Evita que outros modulos acessem diretamente as tabelas/colecoes de alertas |
| EFS em AWS para `/data/db` | Mantem dados do Mongo entre recriacoes de tasks Fargate |
| Mongo containerizado em vez de DocumentDB | Reduz custo e complexidade para entrega academica; atende demonstracao funcional |

Consequencia consciente: MongoDB em container com EFS e adequado para demonstracao e ambiente controlado, mas para producao critica a evolucao recomendada seria migrar para Amazon DocumentDB ou MongoDB Atlas, com backup gerenciado, replica set e politicas de manutencao mais robustas.

### 6.2 Banco de Autenticacao — PostgreSQL

O banco de autenticacao nao pertence ao dominio de Alertas, mas e dependencia obrigatoria para o fluxo completo. O `plus-ms-auth` usa PostgreSQL porque usuarios, roles e relacoes de permissao sao dados naturalmente relacionais e exigem consistencia transacional.

| Decisao | Justificativa |
|---|---|
| PostgreSQL para Auth | Modelo relacional adequado para usuarios, roles e restricoes de unicidade |
| SQLAlchemy no MS Auth | Mapeamento objeto-relacional e criacao de tabelas na inicializacao |
| Seed de admin inicial | Garante demonstracao reproduzivel com `admindev@admin.com` / `Senha123` |
| Banco separado do Mongo de Alertas | Preserva separacao entre identidade e dominio operacional |

### 6.3 Estado do Estoque Fake

O `plus-ms-estoque-fake` utiliza estado em memoria por ser uma ferramenta de demonstracao e testes funcionais. Ele nao substitui o MS4 Estoque real. Sua finalidade arquitetural e permitir validar a integracao do monitoramento de alertas sem depender de outro grupo ou de uma base externa.

## 7. APIs e Contratos

### 7.1 Endpoints de Alertas

| Metodo | Path | Permissao | Responsabilidade |
|---|---|---|---|
| `GET` | `/health` | Publica | Health check do ALB e verificacao operacional |
| `GET` | `/alerta/ativos` | Usuario autenticado | Lista alertas ativos visiveis para operacao |
| `GET` | `/alerta` | Admin | Lista configuracoes de alerta |
| `POST` | `/alerta` | Admin | Cria configuracao de limiar |
| `PATCH` | `/alerta/{id}` | Admin | Atualiza configuracao existente |
| `DELETE` | `/alerta/{id}` | Admin | Remove configuracao |
| `POST` | `/alerta/monitorar` | Admin | Dispara monitoramento manual |

### 7.2 Contrato com Auth

| Item | Decisao |
|---|---|
| Protocolo | HTTP REST |
| Autenticacao | JWT Bearer token |
| Algoritmo atual | HS256 |
| Segredo | `JWT_SECRET` compartilhado entre Auth e Alertas |
| Claims usados | `sub`, `user_id`, `role`, `exp` |
| Regra de permissao | `admin`, `ADMIN` ou roles configuradas em `ADMIN_ROLES` |

O MS de Alertas nao conhece senha e nao cria sessao. Ele apenas valida o token recebido. Essa decisao reduz acoplamento e mantem identidade centralizada no MS Auth.

### 7.3 Contrato com Estoque

| Endpoint esperado | Uso em Alertas |
|---|---|
| `GET /estoque/{roupaId}` | Consulta saldo de uma roupa especifica |
| `GET /estoque/produto/{produtoId}?tamanho=&cor=` | Consulta saldos por produto e grade |
| `POST /estoque/entrada` | Usado em testes para simular entrada |
| `POST /estoque/saida` | Usado em testes para simular saida |

O MS de Alertas nao altera saldo. Ele apenas consulta estoque e calcula status do alerta. Isso preserva o MS Estoque como dono da verdade.

## 8. Infraestrutura AWS Utilizada

| Servico AWS | Papel no modulo de Alertas | Justificativa |
|---|---|---|
| ECS Fargate | Execucao de `plus-ms-alerts`, `plus-mfe-alerts`, `mongo-alertas`, auth e servicos auxiliares | Evita gerenciar EC2 e permite deploy independente por container |
| ECR | Registro privado das imagens Docker | Versionamento e distribuicao das imagens para ECS |
| Application Load Balancer | Entrada publica HTTP e roteamento por path | Simples para demonstracao e suficiente para separar MFE/API por paths |
| Cloud Map | DNS interno `mongo-alertas.alertas.local` e `postgres-auth.alertas.local` | Descoberta de servicos sem IP fixo de task |
| EFS | Persistencia do MongoDB containerizado | Mantem dados de alertas apos restart/recriacao da task |
| SNS | Publicacao de eventos de baixo estoque | Desacopla Alertas de consumidores de notificacao |
| SQS | Fila inscrita no topico SNS | Permite consumo assincrono e reprocessamento futuro |
| CloudWatch Logs | Logs de containers | Diagnostico de deploy, erros de API e monitoramento |
| IAM Roles | Permissoes de task e execucao | Restringe acesso a ECR, logs, SNS e EFS |

### 8.1 Roteamento publico pelo ALB

| Path publico | Destino | Motivo |
|---|---|---|
| `/login`, `/register`, `/success`, `/auth-ui/*` | `plus-mfe-auth:4001` | Tela de login e assets isolados do MFE Auth |
| `/auth`, `/auth/*` | `plus-ms-auth:3001` | API de autenticacao |
| `/alerta`, `/alerta/*`, `/health` | `plus-ms-alerts:3002` | API de alertas e health check |
| `/alertas`, `/assets/*`, rota default | `plus-mfe-alerts:4002` | Interface de alertas e assets do MFE Alerts |

A separacao de assets por `/auth-ui/*` foi adotada porque os dois MFEs geram arquivos em `/assets/*` por padrao. Sem isolamento, o ALB poderia entregar assets do MFE errado, causando tela quebrada ou recarregamentos.

## 9. Ambiente Local, Testes e CI

| Aspecto | Decisao |
|---|---|
| Desenvolvimento local | Docker Compose para subir backends, bancos e frontends |
| Testes unitarios | Jest no `plus-ms-alerts` |
| Testes de integracao | Supertest + MongoDB de teste |
| Testes de contrato | Verificacao dos endpoints esperados da API de alertas |
| Testes funcionais | Fluxo com estoque fake simulando entrada/saida de saldo |
| Cobertura minima | Statements 85%, branches 80%, functions 85%, lines 85% |
| LocalStack | Emula SNS/SQS/S3 para validar notificacoes sem custo AWS |
| GitHub Actions | CI executa testes/cobertura, build do MFE, build Docker e smoke de compose |

Resultado de cobertura local documentado no projeto:

| Metrica | Resultado |
|---|---:|
| Statements | 92.45% |
| Branches | 81.53% |
| Functions | 94.54% |
| Lines | 92.74% |

## 10. Tecnologias Adotadas

### 10.1 Frontend de Alertas

| Tecnologia | Decisao | Justificativa |
|---|---|---|
| React 18 | Aceita | Ecossistema maduro, composicao por componentes e compatibilidade com Module Federation |
| TypeScript | Aceita | Reduz erros entre DTOs do backend e modelos do MFE |
| Vite | Aceita | Build rapido, bom suporte a React e Federation via plugin |
| `@originjs/vite-plugin-federation` | Aceita | Permite expor `AlertsPage` para shell ou servir standalone |
| MUI | Aceita | Componentes robustos para formularios, tabelas, dialogs, chips e feedback visual |
| Strict TypeScript | Aceita | Aumenta confiabilidade do MFE em contratos e estados opcionais |

### 10.2 Backend de Alertas

| Tecnologia | Decisao | Justificativa |
|---|---|---|
| Node.js | Aceita | Adequado para API I/O-bound e integracao simples com MongoDB e AWS SDK |
| Express 5 | Aceita | API REST simples, baixa friccao e facil testabilidade com Supertest |
| Mongoose | Aceita | Schema documental, validacao e acesso idiomatico ao MongoDB |
| AWS SDK SNS | Aceita | Publicacao nativa de eventos em topico SNS |
| JWT | Aceita | Autenticacao stateless e compatibilidade com microservicos |
| Jest | Aceita | Testes unitarios, integracao, contrato e cobertura em um unico runner |

## 11. Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens / Motivo da rejeicao |
|---|---|---|
| Colocar alertas dentro do MS Estoque | Menos chamadas HTTP; acesso direto ao saldo | Mistura responsabilidades; dificulta deploy independente; alertas passam a depender do ciclo de release do estoque |
| Banco relacional para Alertas | Consistencia forte e queries SQL conhecidas | Campos opcionais por grade/filtro geram tabelas mais rigidas; evolucao do documento exige mais migracoes |
| MongoDB gerenciado via DocumentDB/Atlas | Operacao mais robusta em producao | Custo e complexidade maiores para a entrega; container + EFS atende demonstracao academica |
| Sem banco proprio, apenas cache em memoria | Simples e barato | Perde configuracoes em restart; nao atende requisito de persistencia |
| Validar permissao chamando Auth em toda request | Revogacao mais imediata | Aumenta latencia e acoplamento temporal; indisponibilidade do Auth derrubaria Alertas |
| JWT stateless validado localmente | Baixa latencia; Alertas continua respondendo se Auth estiver momentaneamente indisponivel | Revogacao imediata exige estrategia adicional; segredo compartilhado precisa governanca |
| WebSocket para alertas em tempo real | UX em tempo real | Complexidade operacional maior; polling e refresh manual sao suficientes para escopo atual |
| API Gateway no lugar do ALB | Recursos nativos de API, authorizer e throttling | ALB foi suficiente e mais direto para rotear MFEs e APIs containerizados no mesmo deploy de demonstracao |
| Hospedar MFEs em S3/CloudFront | Melhor para assets estaticos e CDN | Exigiria pipeline adicional; ECS com Vite preview simplificou demonstracao integrada |
| SQS direto em vez de SNS + SQS | Menos componentes | SNS permite fan-out futuro para multiplos consumidores sem alterar Alertas |
| LocalStack apenas | Sem custo AWS | Nao comprova deploy real; usado para testes locais, mas AWS real foi mantida para demonstracao |

## 12. Consequencias da Decisao

### 12.1 Consequencias positivas

| Consequencia | Efeito pratico |
|---|---|
| Deploy independente | Corrigir frontend de Alertas ou Auth nao exige redeploy do backend de Alertas |
| Separacao de dominio | Alertas evolui sem assumir responsabilidade por usuario ou estoque |
| Persistencia propria | Configuracoes de alerta continuam disponiveis apos restart |
| Observabilidade | Logs por servico no CloudWatch facilitam diagnostico de API, frontend e banco |
| Escalabilidade seletiva | Backend, frontend e banco podem ser escalados separadamente |
| Integracao demonstravel | Fluxo completo login -> token -> alertas foi validado no ALB publico |
| Baixo acoplamento com Estoque | Troca de estoque fake pelo MS4 real depende principalmente de `ESTOQUE_API_URL` |
| Mensageria preparada | Eventos de alerta ja podem ser consumidos por notificadores futuros |

### 12.2 Consequencias negativas e riscos

| Risco | Impacto | Mitigacao atual | Evolucao recomendada |
|---|---|---|---|
| MongoDB containerizado em Fargate | Operacao menos robusta que banco gerenciado | EFS criptografado persiste dados | Migrar para DocumentDB/Atlas em producao critica |
| Segredo JWT compartilhado | Vazamento compromete validacao entre Auth e Alertas | Variavel de ambiente e escopo limitado | Usar JWT assimetrico com `JWT_PUBLIC_KEY` |
| ALB por path para MFEs | Conflito de assets se MFEs usam mesmo `/assets` | Prefixo `/auth-ui/assets` para Auth | S3/CloudFront por MFE ou paths padronizados por build |
| Estoque fake em memoria | Dados somem ao reiniciar | Uso restrito a demo/teste | Integrar definitivamente com MS4 Estoque |
| Polling de monitoramento | Pode atrasar deteccao de baixo estoque | Intervalo configuravel por env | Eventos de estoque via SNS/SQS para monitorar em tempo quase real |
| Ausencia de tracing distribuido | Debug entre Auth, Alertas e Estoque exige correlacao manual | CloudWatch Logs por servico | Adicionar correlation-id e OpenTelemetry |
| CORS aberto em demo | Facilita validacao publica, mas e permissivo | Ambiente academico/demonstracao | Restringir origens em producao |

## 13. Governanca Arquitetural

### 13.1 Regras de ownership

| Artefato | Dono | Regra |
|---|---|---|
| `plus-ms-alerts` | Time de Alertas | Pode alterar regras de alerta, validacao e monitoramento |
| `plus-mfe-alerts` | Time de Alertas | Pode alterar telas e experiencia de alertas |
| MongoDB de Alertas | Time de Alertas | Acesso direto somente pelo MS de Alertas |
| JWT/roles | Time de Auth + integradores | Mudancas de claims devem ser combinadas antes de deploy |
| Contrato de Estoque | Time de Estoque + integradores | Mudancas em `/estoque/*` exigem compatibilidade ou versao nova |
| SNS/SQS de Alertas | Time de Alertas | Eventos devem manter compatibilidade com consumidores |
| Infra AWS de Alertas | Time de Alertas/DevOps | Mudancas em ALB, ECS, EFS e SGs devem ser registradas em ADR ou revisao |

### 13.2 Politicas de mudanca

| Tipo de mudanca | Exige novo ADR? | Motivo |
|---|---|---|
| Trocar MongoDB por DocumentDB/PostgreSQL | Sim | Altera persistencia e modelo de dados |
| Trocar ALB por API Gateway | Sim | Altera fronteira publica, seguranca e roteamento |
| Trocar JWT HS256 por RS256 | Sim | Altera contrato de autenticacao entre servicos |
| Adicionar consumidor de SNS/SQS | Nao necessariamente | Pode ser extensao se contrato de evento for mantido |
| Alterar payload publico de `/alerta` | Sim, se quebrar compatibilidade | Afeta MFE e consumidores externos |
| Ajustar layout do MFE | Nao | Nao altera arquitetura |
| Ajustar threshold de cobertura | Sim, se reduzir rigor | Impacta governanca de qualidade |

### 13.3 Criterios de aceite arquitetural

| Criterio | Como e atendido |
|---|---|
| Login funcional | `/login` serve MFE Auth e `/auth/login` autentica admin inicial |
| Autorizacao funcional | Token emitido pelo Auth e aceito pelo MS de Alertas |
| API de Alertas publica | `/health` e `/alerta*` roteados pelo ALB |
| Persistencia | Configuracoes armazenadas no MongoDB do contexto |
| Separacao de bancos | Auth usa PostgreSQL; Alertas usa MongoDB |
| Observabilidade | Containers escrevem em CloudWatch Logs |
| Deploy independente | Imagens separadas no ECR e services separados no ECS |
| Testabilidade | Jest cobre unitario, integracao, contrato e funcional |
| Integracao com estoque | `ESTOQUE_API_URL` permite apontar para fake ou MS4 real |
| Notificacao | SNS/SQS preparados para eventos de baixo estoque |

## 14. Seguranca e Permissoes

| Decisao | Justificativa |
|---|---|
| JWT Bearer em todas as rotas de dominio | Remove necessidade de sessao no backend de Alertas |
| RBAC por role admin | Operacoes de escrita em limiares ficam restritas |
| CORS aberto em demonstracao | Permite validar fluxo publico no ALB durante entrega |
| Security Groups por servico | ALB acessa apenas portas publicas; bancos recebem trafego apenas dos MSs |
| Cloud Map para bancos internos | Bancos nao precisam de endpoint publico |
| EFS criptografado | Reduz risco de exposicao de dados persistidos do Mongo |
| IAM task role | MS de Alertas publica apenas no SNS necessario e monta EFS quando aplicavel |

Recomendacao para producao: restringir CORS ao dominio oficial, mover segredos para AWS Secrets Manager/SSM Parameter Store, usar JWT assimetrico, habilitar HTTPS no ALB com ACM e configurar WAF/rate limiting.

## 15. Decisoes de Design do Dominio

| Decisao | Racional |
|---|---|
| Alertas por `roupaId` ou por `produtoId` + filtros | O estoque plus size exige granularidade por grade, mas nem sempre ha identificador de roupa conhecido |
| `quantidadeMinima` por configuracao | Cada produto/tamanho pode ter tolerancia operacional diferente |
| `ativo` separado de `status` | Permite pausar uma configuracao sem perder historico |
| `ultimoSaldo` persistido | Facilita exibicao rapida sem consultar estoque em toda renderizacao |
| `ultimaVerificacaoEm` persistido | Da transparencia operacional sobre a atualidade do alerta |
| `POST /alerta/monitorar` | Permite validacao manual em demonstracao e operacao assistida |
| Publicacao SNS apenas quando cruza limiar | Evita excesso de notificacoes repetidas para o mesmo estado |

## 16. Estado Atual Validado

| Validacao | Resultado |
|---|---|
| `/login` no ALB | Retorna HTML do MFE Auth |
| `/auth-ui/assets/*.js` | Retorna `text/javascript` |
| `/auth/login` | Login com `admindev@admin.com` / `Senha123` retorna JWT |
| `/alerta` com token admin | Retorna `200 OK` |
| `/health` de Alertas | Retorna `{"status":"ok","service":"plus-ms-alerts"}` |
| `/alertas` | Retorna HTML do MFE Alertas |

## 17. Decisao Final

A arquitetura adotada para Alertas e considerada adequada para o contexto academico e para a demonstracao funcional do sistema Plus porque separa responsabilidades, preserva independencia de deploy, utiliza banco proprio para o dominio, integra autenticacao e estoque por contratos explicitos, possui caminho de notificacao assincrona e foi implantada em AWS com servicos reais.

A decisao tambem deixa claro o caminho de evolucao: trocar componentes de demonstracao por alternativas gerenciadas quando o sistema sair do contexto academico, principalmente MongoDB containerizado, Postgres demo, CORS permissivo e `JWT_SECRET` compartilhado.

## 18. Historico de Revisoes

| Versao | Data | Autor | Descricao |
|---|---|---|---|
| v1.0 | Junho/2026 | Time de Alertas | ADR inicial do modulo de Alertas, cobrindo MFE, MS, bancos, AWS, integracoes, trade-offs e governanca |

Decisoes arquiteturais relevantes que alterem persistencia, seguranca, roteamento publico, mensageria, contrato com Auth ou contrato com Estoque devem gerar uma nova versao deste ADR.

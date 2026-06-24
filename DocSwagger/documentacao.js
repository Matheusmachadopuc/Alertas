const express = require('express');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = process.env.PORT || 3060;

const swaggerSpec = {
    openapi: '3.0.3',
    info: {
        title: 'API de Alertas de Estoque',
        version: '1.0.0',
        description: 'Documentacao exclusiva do backend plus-ms-alerts.',
    },
    servers: [
        {
            url: 'http://localhost:3002',
            description: 'plus-ms-alerts local',
        },
        {
            url: 'http://localhost:3005',
            description: 'plus-ms-alerts no compose de teste',
        },
    ],
    tags: [
        {
            name: 'Alertas',
            description: 'Configuracao, consulta e monitoramento de alertas de estoque.',
        },
        {
            name: 'Saude',
            description: 'Health check do servico.',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT emitido pelo servico de autenticacao. Admin e exigido nas rotas de gestao.',
            },
        },
        schemas: {
            Alerta: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        example: '550e8400-e29b-41d4-a716-446655440000',
                    },
                    produtoId: {
                        type: 'string',
                        example: 'produto-001',
                    },
                    roupaId: {
                        type: 'string',
                        nullable: true,
                        example: 'roupa-001',
                    },
                    produtoNome: {
                        type: 'string',
                        nullable: true,
                        example: 'Camiseta',
                    },
                    categoria: {
                        type: 'string',
                        nullable: true,
                        example: 'Roupas',
                    },
                    tamanho: {
                        type: 'string',
                        nullable: true,
                        example: 'M',
                    },
                    cor: {
                        type: 'string',
                        nullable: true,
                        example: 'Azul',
                    },
                    quantidadeMinima: {
                        type: 'number',
                        minimum: 0,
                        example: 10,
                    },
                    ativo: {
                        type: 'boolean',
                        example: true,
                    },
                    status: {
                        type: 'string',
                        enum: ['OK', 'ATIVO', 'ERRO'],
                        example: 'ATIVO',
                    },
                    ultimoSaldo: {
                        type: 'number',
                        nullable: true,
                        example: 4,
                    },
                    mensagem: {
                        type: 'string',
                        nullable: true,
                        example: 'Camiseta - tamanho M - cor Azul atingiu saldo 4, limiar 10',
                    },
                    ultimaVerificacaoEm: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                    },
                    notificadoEm: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                    },
                    criadoPor: {
                        type: 'string',
                        nullable: true,
                        example: 'admindev@admin.com',
                    },
                    atualizadoPor: {
                        type: 'string',
                        nullable: true,
                        example: 'admindev@admin.com',
                    },
                    criadoEm: {
                        type: 'string',
                        format: 'date-time',
                    },
                    atualizadoEm: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
                required: ['id', 'produtoId', 'quantidadeMinima', 'ativo', 'status'],
            },
            AlertaCreate: {
                type: 'object',
                required: ['produtoId', 'quantidadeMinima'],
                properties: {
                    produtoId: {
                        type: 'string',
                        example: 'produto-001',
                    },
                    roupaId: {
                        type: 'string',
                        example: 'roupa-001',
                    },
                    produtoNome: {
                        type: 'string',
                        example: 'Camiseta',
                    },
                    categoria: {
                        type: 'string',
                        example: 'Roupas',
                    },
                    tamanho: {
                        type: 'string',
                        example: 'M',
                    },
                    cor: {
                        type: 'string',
                        example: 'Azul',
                    },
                    quantidadeMinima: {
                        type: 'number',
                        minimum: 0,
                        example: 10,
                    },
                    ativo: {
                        type: 'boolean',
                        default: true,
                        example: true,
                    },
                },
            },
            AlertaPatch: {
                type: 'object',
                minProperties: 1,
                properties: {
                    produtoId: {
                        type: 'string',
                        example: 'produto-001',
                    },
                    roupaId: {
                        type: 'string',
                        example: 'roupa-001',
                    },
                    produtoNome: {
                        type: 'string',
                        example: 'Camiseta Premium',
                    },
                    categoria: {
                        type: 'string',
                        example: 'Roupas',
                    },
                    tamanho: {
                        type: 'string',
                        example: 'M',
                    },
                    cor: {
                        type: 'string',
                        example: 'Azul',
                    },
                    quantidadeMinima: {
                        type: 'number',
                        minimum: 0,
                        example: 5,
                    },
                    ativo: {
                        type: 'boolean',
                        example: false,
                    },
                },
            },
            MonitoramentoResultado: {
                type: 'object',
                properties: {
                    skipped: {
                        type: 'boolean',
                        example: false,
                    },
                    reason: {
                        type: 'string',
                        example: 'monitoramento ja em execucao',
                    },
                    total: {
                        type: 'integer',
                        example: 2,
                    },
                    resultados: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/MonitoramentoItem',
                        },
                    },
                },
            },
            MonitoramentoItem: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                    },
                    status: {
                        type: 'string',
                        enum: ['OK', 'ATIVO', 'ERRO'],
                    },
                    saldo: {
                        type: 'number',
                        example: 4,
                    },
                    erro: {
                        type: 'string',
                        example: 'Falha ao consultar estoque',
                    },
                },
            },
            Health: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        example: 'ok',
                    },
                    service: {
                        type: 'string',
                        example: 'plus-ms-alerts',
                    },
                },
            },
            Erro: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        example: 'Alerta nao encontrado',
                    },
                },
            },
        },
        parameters: {
            AlertaId: {
                in: 'path',
                name: 'id',
                required: true,
                schema: {
                    type: 'string',
                    format: 'uuid',
                },
                description: 'Identificador publico do alerta.',
            },
            ProdutoId: {
                in: 'query',
                name: 'produtoId',
                schema: {
                    type: 'string',
                },
            },
            Categoria: {
                in: 'query',
                name: 'categoria',
                schema: {
                    type: 'string',
                },
            },
            Tamanho: {
                in: 'query',
                name: 'tamanho',
                schema: {
                    type: 'string',
                },
            },
            Cor: {
                in: 'query',
                name: 'cor',
                schema: {
                    type: 'string',
                },
            },
            Status: {
                in: 'query',
                name: 'status',
                schema: {
                    type: 'string',
                    enum: ['OK', 'ATIVO', 'ERRO'],
                },
            },
            Ativo: {
                in: 'query',
                name: 'ativo',
                schema: {
                    type: 'boolean',
                },
            },
        },
        responses: {
            Unauthorized: {
                description: 'Token ausente, invalido ou expirado.',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Erro',
                        },
                    },
                },
            },
            Forbidden: {
                description: 'Usuario autenticado sem perfil admin.',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Erro',
                        },
                    },
                },
            },
            BadRequest: {
                description: 'Payload invalido.',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Erro',
                        },
                    },
                },
            },
            NotFound: {
                description: 'Alerta nao encontrado.',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Erro',
                        },
                    },
                },
            },
        },
    },
    paths: {
        '/health': {
            get: {
                tags: ['Saude'],
                summary: 'Verifica se o servico de alertas esta ativo',
                responses: {
                    200: {
                        description: 'Servico ativo.',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Health',
                                },
                            },
                        },
                    },
                },
            },
        },
        '/alerta/ativos': {
            get: {
                tags: ['Alertas'],
                summary: 'Lista alertas ativos para usuario autenticado',
                description: 'Retorna apenas alertas com ativo=true e status=ATIVO. Aceita filtros por produto, categoria, tamanho e cor.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/ProdutoId' },
                    { $ref: '#/components/parameters/Categoria' },
                    { $ref: '#/components/parameters/Tamanho' },
                    { $ref: '#/components/parameters/Cor' },
                ],
                responses: {
                    200: {
                        description: 'Lista de alertas ativos.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        $ref: '#/components/schemas/Alerta',
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized',
                    },
                },
            },
        },
        '/alerta': {
            get: {
                tags: ['Alertas'],
                summary: 'Lista configuracoes de alertas',
                description: 'Rota administrativa. Retorna alertas configurados, com filtros opcionais.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/ProdutoId' },
                    { $ref: '#/components/parameters/Categoria' },
                    { $ref: '#/components/parameters/Tamanho' },
                    { $ref: '#/components/parameters/Cor' },
                    { $ref: '#/components/parameters/Status' },
                    { $ref: '#/components/parameters/Ativo' },
                ],
                responses: {
                    200: {
                        description: 'Lista de configuracoes.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        $ref: '#/components/schemas/Alerta',
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized',
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden',
                    },
                },
            },
            post: {
                tags: ['Alertas'],
                summary: 'Cria uma configuracao de alerta',
                description: 'Rota administrativa. produtoId e quantidadeMinima sao obrigatorios.',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/AlertaCreate',
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: 'Alerta criado.',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Alerta',
                                },
                            },
                        },
                    },
                    400: {
                        $ref: '#/components/responses/BadRequest',
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized',
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden',
                    },
                },
            },
        },
        '/alerta/{id}': {
            patch: {
                tags: ['Alertas'],
                summary: 'Atualiza parcialmente uma configuracao de alerta',
                description: 'Rota administrativa. Informe pelo menos um campo valido.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/AlertaId' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/AlertaPatch',
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Alerta atualizado.',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Alerta',
                                },
                            },
                        },
                    },
                    400: {
                        $ref: '#/components/responses/BadRequest',
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized',
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden',
                    },
                    404: {
                        $ref: '#/components/responses/NotFound',
                    },
                },
            },
            delete: {
                tags: ['Alertas'],
                summary: 'Remove uma configuracao de alerta',
                description: 'Rota administrativa.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/AlertaId' },
                ],
                responses: {
                    204: {
                        description: 'Alerta removido.',
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized',
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden',
                    },
                    404: {
                        $ref: '#/components/responses/NotFound',
                    },
                },
            },
        },
        '/alerta/monitorar': {
            post: {
                tags: ['Alertas'],
                summary: 'Executa uma verificacao de estoque sob demanda',
                description: 'Rota administrativa mantida no backend. O monitoramento automatico tambem roda a cada minuto quando o servico esta ativo.',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Resultado do monitoramento.',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/MonitoramentoResultado',
                                },
                            },
                        },
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized',
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden',
                    },
                },
            },
        },
    },
};

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'docswagger-alertas' });
});

app.get('/openapi.json', (req, res) => {
    res.json(swaggerSpec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(PORT, () => {
    console.log(`Swagger de Alertas disponivel em http://localhost:${PORT}/docs`);
});

module.exports = app;

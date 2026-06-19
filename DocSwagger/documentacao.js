const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const connectDatabase = require('./src/config/database');
const alertaRoutes = require('./src/routes/alertaRoutes');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Alertas',
            version: '1.0.0',
            description: 'Gerenciamento de alertas e condicoes',
        },
        components: {
            schemas: {
                Alerta: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        nome: { type: 'string' },
                        descricao: { type: 'string' },
                        condicao: { type: 'string' },
                        nivel: { type: 'string', enum: ['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'] },
                        criadoEm: { type: 'string', format: 'date-time' },
                        atualizadoEm: { type: 'string', format: 'date-time' },
                    },
                },
                Erro: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-alertas' });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/', alertaRoutes);
app.use(errorHandler);

connectDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
            console.log(`Swagger disponivel em http://localhost:${PORT}/docs`);
        });
    })
    .catch((error) => {
        console.error('Falha ao conectar ao banco de dados:', error.message);
        process.exit(1);
    });

module.exports = app;

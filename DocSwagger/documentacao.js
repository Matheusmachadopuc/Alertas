const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Alertas',
            version: '1.0.0',
            description: 'Gerenciamento de alertas e condições',
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
                        nivel: { type: 'string', enum: ['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'] }
                    }
                }
            }
        }
    },
    apis: [__filename], // Lê a documentação deste próprio arquivo
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

let alertas = [];

/**
 * @openapi
 * /alerta:
 *   get:
 *     summary: Lista todos os alertas
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Alerta'
 */
app.get('/alerta', (req, res) => {
    res.json(alertas);
});

/**
 * @openapi
 * /alerta:
 *   post:
 *     summary: Cria um novo alerta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Alerta'
 *     responses:
 *       201:
 *         description: Criado com sucesso
 */
app.post('/alerta', (req, res) => {
    const novoAlerta = { id: uuidv4(), ...req.body };
    alertas.push(novoAlerta);
    res.status(201).json(novoAlerta);
});

/**
 * @openapi
 * /alerta/{id}:
 *   patch:
 *     summary: Atualiza parcialmente um alerta
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 */
app.patch('/alerta/:id', (req, res) => {
    const { id } = req.params;
    const index = alertas.findIndex(a => a.id === id);
    if (index === -1) return res.status(404).send('Não encontrado');

    alertas[index] = { ...alertas[index], ...req.body };
    res.json(alertas[index]);
});

/**
 * @openapi
 * /alerta/{id}:
 *   delete:
 *     summary: Deleta um alerta
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 */
app.delete('/alerta/:id', (req, res) => {
    const { id } = req.params;
    const index = alertas.findIndex(a => a.id === id);

    if (index === -1) return res.status(404).send('Alerta não encontrado');

    alertas.splice(index, 1);
    res.status(204).send();
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Swagger disponível em http://localhost:${PORT}/docs`);
});
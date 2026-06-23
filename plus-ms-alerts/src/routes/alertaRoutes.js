const express = require('express');
const alertaController = require('../controllers/alertaController');
const { authenticate, requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * /alerta/ativos:
 *   get:
 *     summary: Lista alertas ativos de estoque
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
router.get('/alerta/ativos', authenticate, alertaController.listarAtivos);

router.post('/alerta/monitorar', authenticate, requireAdmin, alertaController.monitorarAgora);

router.get('/alerta', authenticate, requireAdmin, alertaController.listar);

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
 *       400:
 *         description: Requisicao invalida
 */
router.post('/alerta', authenticate, requireAdmin, alertaController.criar);

/**
 * @openapi
 * /alerta/{id}:
 *   patch:
 *     summary: Atualiza parcialmente um alerta
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Alerta'
 *     responses:
 *       200:
 *         description: Atualizado com sucesso
 *       404:
 *         description: Alerta nao encontrado
 */
router.patch('/alerta/:id', authenticate, requireAdmin, alertaController.atualizarParcial);

/**
 * @openapi
 * /alerta/{id}:
 *   delete:
 *     summary: Deleta um alerta
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Removido com sucesso
 *       404:
 *         description: Alerta nao encontrado
 */
router.delete('/alerta/:id', authenticate, requireAdmin, alertaController.remover);

module.exports = router;

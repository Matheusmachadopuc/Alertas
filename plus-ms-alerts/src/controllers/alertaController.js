const alertaService = require('../services/alertaService');

async function listar(req, res, next) {
    try {
        const alertas = await alertaService.listar();
        res.json(alertas);
    } catch (error) {
        next(error);
    }
}

async function criar(req, res, next) {
    try {
        const alerta = await alertaService.criar(req.body);
        res.status(201).json(alerta);
    } catch (error) {
        next(error);
    }
}

async function atualizarParcial(req, res, next) {
    try {
        const alerta = await alertaService.atualizarParcial(req.params.id, req.body);
        res.json(alerta);
    } catch (error) {
        next(error);
    }
}

async function remover(req, res, next) {
    try {
        await alertaService.remover(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listar,
    criar,
    atualizarParcial,
    remover,
};

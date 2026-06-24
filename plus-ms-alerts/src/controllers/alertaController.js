const alertaService = require('../services/alertaService');
const { verificarAlertas } = require('../services/alertaMonitor');

async function listar(req, res, next) {
    try {
        const alertas = await alertaService.listar(req.query);
        res.json(alertas);
    } catch (error) {
        next(error);
    }
}

async function listarAtivos(req, res, next) {
    try {
        const alertas = await alertaService.listarAtivos(req.query);
        res.json(alertas);
    } catch (error) {
        next(error);
    }
}

async function criar(req, res, next) {
    try {
        const alerta = await alertaService.criar(req.body, req.user);
        res.status(201).json(alerta);
    } catch (error) {
        next(error);
    }
}

async function atualizarParcial(req, res, next) {
    try {
        const alerta = await alertaService.atualizarParcial(req.params.id, req.body, req.user);
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

async function monitorarAgora(req, res, next) {
    try {
        const resultado = await verificarAlertas();
        res.json(resultado);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listar,
    listarAtivos,
    criar,
    atualizarParcial,
    remover,
    monitorarAgora,
};

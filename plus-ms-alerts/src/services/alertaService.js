const Alerta = require('../models/alertaModel');
const AppError = require('../errors/AppError');
const { validateCreate, validatePatch } = require('../validators/alertaValidator');

async function listar() {
    return Alerta.find().sort({ criadoEm: -1 });
}

async function criar(payload) {
    const dados = validateCreate(payload);
    return Alerta.create(dados);
}

async function atualizarParcial(id, payload) {
    const dados = validatePatch(payload);
    const alerta = await Alerta.findOneAndUpdate({ id }, dados, {
        new: true,
        runValidators: true,
    });

    if (!alerta) {
        throw new AppError('Alerta nao encontrado', 404);
    }

    return alerta;
}

async function remover(id) {
    const alerta = await Alerta.findOneAndDelete({ id });

    if (!alerta) {
        throw new AppError('Alerta nao encontrado', 404);
    }
}

module.exports = {
    listar,
    criar,
    atualizarParcial,
    remover,
};

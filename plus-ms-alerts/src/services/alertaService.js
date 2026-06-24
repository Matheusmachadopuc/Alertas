const Alerta = require('../models/alertaModel');
const AppError = require('../errors/AppError');
const { validateCreate, validatePatch } = require('../validators/alertaValidator');

const FILTROS_PERMITIDOS = ['produtoId', 'categoria', 'tamanho', 'cor', 'status'];

function montarFiltros(query = {}) {
    const filtros = {};

    FILTROS_PERMITIDOS.forEach((campo) => {
        if (query[campo]) {
            filtros[campo] = String(query[campo]).trim();
        }
    });

    if (query.ativo !== undefined) {
        filtros.ativo = String(query.ativo) !== 'false';
    }

    return filtros;
}

async function listar(query = {}) {
    return Alerta.find(montarFiltros(query)).sort({ atualizadoEm: -1 });
}

async function listarAtivos(query = {}) {
    return Alerta.find({
        ...montarFiltros(query),
        ativo: true,
        status: 'ATIVO',
    }).sort({ ultimaVerificacaoEm: -1, atualizadoEm: -1 });
}

async function criar(payload, user = {}) {
    const dados = validateCreate(payload);

    return Alerta.create({
        ...dados,
        criadoPor: user.email || user.id,
        atualizadoPor: user.email || user.id,
    });
}

async function atualizarParcial(id, payload, user = {}) {
    const dados = validatePatch(payload);
    const alerta = await Alerta.findOneAndUpdate(
        { id },
        {
            ...dados,
            atualizadoPor: user.email || user.id,
        },
        {
            new: true,
            runValidators: true,
        }
    );

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
    listarAtivos,
    criar,
    atualizarParcial,
    remover,
};

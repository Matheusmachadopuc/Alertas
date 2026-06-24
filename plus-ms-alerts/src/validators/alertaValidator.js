const AppError = require('../errors/AppError');

const CAMPOS_TEXTO = ['produtoId', 'roupaId', 'produtoNome', 'categoria', 'tamanho', 'cor'];
const CAMPOS_BOOLEANOS = ['ativo'];

function assertObject(payload) {
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
        throw new AppError('Corpo da requisicao deve ser um objeto JSON');
    }
}

function sanitizeText(value) {
    return typeof value === 'string' ? value.trim() : value;
}

function normalizeQuantidade(value) {
    const quantidade = typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : value;

    if (!Number.isFinite(quantidade) || quantidade < 0) {
        throw new AppError('Campo quantidadeMinima deve ser um numero maior ou igual a zero');
    }

    return quantidade;
}

function sanitize(payload) {
    const dados = {};

    CAMPOS_TEXTO.forEach((campo) => {
        if (payload[campo] !== undefined) {
            dados[campo] = sanitizeText(payload[campo]);
        }
    });

    CAMPOS_BOOLEANOS.forEach((campo) => {
        if (payload[campo] !== undefined) {
            dados[campo] = Boolean(payload[campo]);
        }
    });

    if (payload.quantidadeMinima !== undefined) {
        dados.quantidadeMinima = normalizeQuantidade(payload.quantidadeMinima);
    }

    return dados;
}

function validateCreate(payload) {
    assertObject(payload);

    const dados = sanitize(payload);

    if (!dados.produtoId) {
        throw new AppError('Campo obrigatorio ausente: produtoId');
    }

    if (dados.quantidadeMinima === undefined) {
        throw new AppError('Campo obrigatorio ausente: quantidadeMinima');
    }

    return dados;
}

function validatePatch(payload) {
    assertObject(payload);

    const dados = sanitize(payload);

    if (Object.keys(dados).length === 0) {
        throw new AppError('Informe ao menos um campo valido para atualizar');
    }

    if (dados.produtoId !== undefined && !dados.produtoId) {
        throw new AppError('Campo produtoId nao pode ser vazio');
    }

    return dados;
}

module.exports = {
    validateCreate,
    validatePatch,
};

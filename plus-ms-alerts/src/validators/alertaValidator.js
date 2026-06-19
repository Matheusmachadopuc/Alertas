const AppError = require('../errors/AppError');

const CAMPOS_PERMITIDOS = ['nome', 'descricao', 'condicao', 'nivel'];
const CAMPOS_OBRIGATORIOS = ['nome', 'descricao', 'condicao', 'nivel'];
const NIVEIS_VALIDOS = ['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'];

function assertObject(payload) {
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
        throw new AppError('Corpo da requisicao deve ser um objeto JSON');
    }
}

function sanitize(payload) {
    return CAMPOS_PERMITIDOS.reduce((dados, campo) => {
        if (payload[campo] !== undefined) {
            dados[campo] = typeof payload[campo] === 'string' ? payload[campo].trim() : payload[campo];
        }

        return dados;
    }, {});
}

function validateCommon(dados) {
    Object.entries(dados).forEach(([campo, valor]) => {
        if (typeof valor !== 'string' || !valor.trim()) {
            throw new AppError(`Campo ${campo} deve ser uma string nao vazia`);
        }
    });

    if (dados.nivel && !NIVEIS_VALIDOS.includes(dados.nivel)) {
        throw new AppError('Campo nivel deve ser BAIXO, MEDIO, ALTO ou CRITICO');
    }
}

function validateCreate(payload) {
    assertObject(payload);

    const dados = sanitize(payload);
    const campoAusente = CAMPOS_OBRIGATORIOS.find((campo) => !dados[campo]);

    if (campoAusente) {
        throw new AppError(`Campo obrigatorio ausente: ${campoAusente}`);
    }

    validateCommon(dados);
    return dados;
}

function validatePatch(payload) {
    assertObject(payload);

    const dados = sanitize(payload);

    if (Object.keys(dados).length === 0) {
        throw new AppError('Informe ao menos um campo valido para atualizar');
    }

    validateCommon(dados);
    return dados;
}

module.exports = {
    validateCreate,
    validatePatch,
};

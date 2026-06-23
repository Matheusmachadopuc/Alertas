const crypto = require('crypto');
const mongoose = require('mongoose');

const alertaSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            default: crypto.randomUUID,
            unique: true,
            index: true,
        },
        produtoId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        roupaId: {
            type: String,
            trim: true,
            index: true,
        },
        produtoNome: {
            type: String,
            trim: true,
        },
        categoria: {
            type: String,
            trim: true,
            index: true,
        },
        tamanho: {
            type: String,
            trim: true,
            index: true,
        },
        cor: {
            type: String,
            trim: true,
        },
        quantidadeMinima: {
            type: Number,
            required: true,
            min: 0,
        },
        ativo: {
            type: Boolean,
            default: true,
        },
        status: {
            type: String,
            enum: ['OK', 'ATIVO', 'ERRO'],
            default: 'OK',
            index: true,
        },
        ultimoSaldo: {
            type: Number,
            default: null,
        },
        mensagem: {
            type: String,
            trim: true,
        },
        ultimaVerificacaoEm: {
            type: Date,
            default: null,
        },
        notificadoEm: {
            type: Date,
            default: null,
        },
        criadoPor: {
            type: String,
            trim: true,
        },
        atualizadoPor: {
            type: String,
            trim: true,
        },
    },
    {
        collection: 'alertas',
        timestamps: {
            createdAt: 'criadoEm',
            updatedAt: 'atualizadoEm',
        },
        versionKey: false,
        toJSON: {
            transform: (doc, ret) => {
                delete ret._id;
                return ret;
            },
        },
    }
);

module.exports = mongoose.model('Alerta', alertaSchema);

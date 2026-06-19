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
        nome: {
            type: String,
            required: true,
            trim: true,
        },
        descricao: {
            type: String,
            required: true,
            trim: true,
        },
        condicao: {
            type: String,
            required: true,
            trim: true,
        },
        nivel: {
            type: String,
            required: true,
            enum: ['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'],
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

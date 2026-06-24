const Alerta = require('../models/alertaModel');
const { consultarSaldo } = require('./estoqueClient');
const { notificarAlertaEstoque } = require('./notificationService');

const DEFAULT_INTERVAL_MS = 60 * 1000;

let intervalId = null;
let isRunning = false;

function criarMensagem(alerta, saldo) {
    const partes = [
        alerta.produtoNome || `Produto ${alerta.produtoId}`,
        alerta.tamanho ? `tamanho ${alerta.tamanho}` : null,
        alerta.cor ? `cor ${alerta.cor}` : null,
    ].filter(Boolean);

    return `${partes.join(' - ')} atingiu saldo ${saldo}, limiar ${alerta.quantidadeMinima}`;
}

async function verificarAlerta(alerta) {
    const { saldo } = await consultarSaldo(alerta);
    const atingiuLimiar = saldo <= alerta.quantidadeMinima;
    const now = new Date();

    alerta.ultimoSaldo = saldo;
    alerta.ultimaVerificacaoEm = now;
    alerta.status = atingiuLimiar ? 'ATIVO' : 'OK';
    alerta.mensagem = atingiuLimiar ? criarMensagem(alerta, saldo) : '';

    if (atingiuLimiar && !alerta.notificadoEm) {
        await notificarAlertaEstoque(alerta, saldo);
        alerta.notificadoEm = now;
    }

    if (!atingiuLimiar) {
        alerta.notificadoEm = null;
    }

    await alerta.save();

    return {
        id: alerta.id,
        status: alerta.status,
        saldo,
    };
}

async function verificarAlertas() {
    if (isRunning) {
        return { skipped: true, reason: 'monitoramento ja em execucao' };
    }

    isRunning = true;

    try {
        const alertas = await Alerta.find({ ativo: true });
        const resultados = [];

        for (const alerta of alertas) {
            try {
                resultados.push(await verificarAlerta(alerta));
            } catch (error) {
                alerta.status = 'ERRO';
                alerta.mensagem = error.message;
                alerta.ultimaVerificacaoEm = new Date();
                await alerta.save();

                resultados.push({
                    id: alerta.id,
                    status: 'ERRO',
                    erro: error.message,
                });
            }
        }

        return {
            total: alertas.length,
            resultados,
        };
    } finally {
        isRunning = false;
    }
}

function startMonitoramentoEstoque() {
    if (intervalId) {
        return;
    }

    const intervalMs = Number(process.env.ALERTS_MONITOR_INTERVAL_MS || DEFAULT_INTERVAL_MS);

    verificarAlertas().catch((error) => {
        console.error('Falha no monitoramento inicial de estoque:', error.message);
    });

    intervalId = setInterval(() => {
        verificarAlertas().catch((error) => {
            console.error('Falha no monitoramento de estoque:', error.message);
        });
    }, intervalMs);
}

function stopMonitoramentoEstoque() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

module.exports = {
    verificarAlertas,
    startMonitoramentoEstoque,
    stopMonitoramentoEstoque,
};

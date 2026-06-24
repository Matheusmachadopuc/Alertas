jest.mock('../../src/models/alertaModel', () => ({
    find: jest.fn(),
}));

jest.mock('../../src/services/estoqueClient', () => ({
    consultarSaldo: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
    notificarAlertaEstoque: jest.fn().mockResolvedValue({ messageId: 'message-1' }),
}));

const Alerta = require('../../src/models/alertaModel');
const { consultarSaldo } = require('../../src/services/estoqueClient');
const { notificarAlertaEstoque } = require('../../src/services/notificationService');
const {
    verificarAlertas,
    startMonitoramentoEstoque,
    stopMonitoramentoEstoque,
} = require('../../src/services/alertaMonitor');

function alerta(overrides = {}) {
    return {
        id: 'alerta-1',
        produtoId: 'produto-1',
        produtoNome: 'Camiseta',
        tamanho: 'M',
        cor: 'Azul',
        quantidadeMinima: 10,
        status: 'OK',
        notificadoEm: null,
        save: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

describe('alertaMonitor', () => {
    afterEach(() => {
        stopMonitoramentoEstoque();
    });

    it('marca alerta como ATIVO quando saldo atinge limiar', async () => {
        const item = alerta();
        Alerta.find.mockResolvedValue([item]);
        consultarSaldo.mockResolvedValue({ saldo: 4, origem: { roupaId: 'roupa-1' } });

        const result = await verificarAlertas();

        expect(result).toMatchObject({
            total: 1,
            resultados: [{ id: 'alerta-1', status: 'ATIVO', saldo: 4 }],
        });
        expect(item.status).toBe('ATIVO');
        expect(item.ultimoSaldo).toBe(4);
        expect(item.mensagem).toContain('atingiu saldo 4');
        expect(item.notificadoEm).toBeInstanceOf(Date);
        expect(notificarAlertaEstoque).toHaveBeenCalledWith(item, 4);
        expect(item.save).toHaveBeenCalledTimes(1);
    });

    it('marca alerta como OK e limpa notificacao quando saldo passa do limiar', async () => {
        const item = alerta({ status: 'ATIVO', notificadoEm: new Date() });
        Alerta.find.mockResolvedValue([item]);
        consultarSaldo.mockResolvedValue({ saldo: 15, origem: { roupaId: 'roupa-1' } });

        await verificarAlertas();

        expect(item.status).toBe('OK');
        expect(item.ultimoSaldo).toBe(15);
        expect(item.mensagem).toBe('');
        expect(item.notificadoEm).toBeNull();
        expect(notificarAlertaEstoque).not.toHaveBeenCalled();
    });

    it('marca ERRO quando nao consegue consultar o estoque', async () => {
        const item = alerta();
        Alerta.find.mockResolvedValue([item]);
        consultarSaldo.mockRejectedValue(new Error('estoque fora'));

        const result = await verificarAlertas();

        expect(result.resultados[0]).toMatchObject({
            id: 'alerta-1',
            status: 'ERRO',
            erro: 'estoque fora',
        });
        expect(item.status).toBe('ERRO');
        expect(item.mensagem).toBe('estoque fora');
        expect(item.save).toHaveBeenCalledTimes(1);
    });

    it('agenda monitoramento recorrente e evita iniciar duas vezes', async () => {
        jest.useFakeTimers();
        process.env.ALERTS_MONITOR_INTERVAL_MS = '1000';
        Alerta.find.mockResolvedValue([]);

        startMonitoramentoEstoque();
        startMonitoramentoEstoque();

        await Promise.resolve();
        expect(Alerta.find).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        expect(Alerta.find).toHaveBeenCalledTimes(2);
        stopMonitoramentoEstoque();
        jest.useRealTimers();
    });

    it('ignora nova execucao enquanto monitoramento anterior esta em andamento', async () => {
        let resolveFind;
        Alerta.find.mockReturnValue(new Promise((resolve) => {
            resolveFind = resolve;
        }));

        const first = verificarAlertas();
        const second = await verificarAlertas();

        expect(second).toEqual({ skipped: true, reason: 'monitoramento ja em execucao' });

        resolveFind([]);
        await expect(first).resolves.toMatchObject({ total: 0 });
    });
});

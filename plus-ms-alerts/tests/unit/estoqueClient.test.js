describe('estoqueClient', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env.ESTOQUE_API_URL = 'http://estoque.test';
        global.fetch = jest.fn();
    });

    afterEach(() => {
        delete global.fetch;
    });

    it('consulta saldo de uma roupa especifica', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ roupaId: 'roupa-1', saldoAtual: 7 }),
        });

        const { consultarSaldo } = require('../../src/services/estoqueClient');
        const result = await consultarSaldo({ roupaId: 'roupa-1' });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.objectContaining({ href: 'http://estoque.test/estoque/roupa-1' }),
            expect.objectContaining({ method: 'GET' })
        );
        expect(result.saldo).toBe(7);
    });

    it('consulta saldo critico por produto, tamanho e cor', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => [
                { produtoId: 'produto-1', roupaId: 'r1', tamanho: 'M', cor: 'Azul', saldo: 12 },
                { produtoId: 'produto-1', roupaId: 'r2', tamanho: 'M', cor: 'Azul', saldo: 3 },
                { produtoId: 'produto-1', roupaId: 'r3', tamanho: 'G', cor: 'Azul', saldo: 1 },
            ],
        });

        const { consultarSaldo } = require('../../src/services/estoqueClient');
        const result = await consultarSaldo({
            produtoId: 'produto-1',
            tamanho: 'M',
            cor: 'Azul',
        });

        const calledUrl = global.fetch.mock.calls[0][0].toString();
        expect(calledUrl).toContain('/estoque/produto/produto-1');
        expect(calledUrl).toContain('tamanho=M');
        expect(calledUrl).toContain('cor=Azul');
        expect(result.saldo).toBe(3);
        expect(result.origem.roupaId).toBe('r2');
    });

    it('aceita payload envelopado do MS Estoque', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ items: [{ produtoId: 'p1', saldoAtual: 4 }] }),
        });

        const { consultarSaldo } = require('../../src/services/estoqueClient');
        await expect(consultarSaldo({ produtoId: 'p1' })).resolves.toMatchObject({ saldo: 4 });
    });

    it('aceita envelopes data e estoque e campos alternativos de quantidade', async () => {
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [{ produtoId: 'p1', quantidade: 6 }] }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ estoque: [{ produtoId: 'p1', quantidadeAtual: 9 }] }),
            });

        const { consultarSaldo } = require('../../src/services/estoqueClient');

        await expect(consultarSaldo({ produtoId: 'p1' })).resolves.toMatchObject({ saldo: 6 });
        await expect(consultarSaldo({ produtoId: 'p1' })).resolves.toMatchObject({ saldo: 9 });
    });

    it('ignora itens que nao batem com produto, roupa, tamanho ou cor', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => [
                { produtoId: 'outro', roupaId: 'r1', tamanho: 'M', cor: 'Azul', saldo: 1 },
                { produtoId: 'p1', roupaId: 'outra', tamanho: 'M', cor: 'Azul', saldo: 2 },
                { produtoId: 'p1', roupaId: 'r2', tamanho: 'G', cor: 'Azul', saldo: 3 },
                { produtoId: 'p1', roupaId: 'r2', tamanho: 'M', cor: 'Verde', saldo: 4 },
                { produtoId: 'p1', roupaId: 'r2', tamanho: 'M', cor: 'Azul', estoque: 5 },
            ],
        });

        const { consultarSaldo } = require('../../src/services/estoqueClient');
        const result = await consultarSaldo({
            produtoId: 'p1',
            roupaId: null,
            tamanho: 'M',
            cor: 'Azul',
        });

        expect(result.saldo).toBe(2);
        expect(result.origem.roupaId).toBe('outra');
    });

    it('normaliza erro de rede do MS Estoque', async () => {
        global.fetch.mockRejectedValue(new Error('ECONNREFUSED'));

        const { consultarSaldo } = require('../../src/services/estoqueClient');
        await expect(consultarSaldo({ roupaId: 'roupa-1' })).rejects.toThrow('ECONNREFUSED');
    });

    it('retorna erro quando o MS Estoque responde falha', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 503,
            json: async () => ({}),
        });

        const { consultarSaldo } = require('../../src/services/estoqueClient');
        await expect(consultarSaldo({ roupaId: 'roupa-1' })).rejects.toThrow('status 503');
    });

    it('retorna erro quando nao encontra saldo para os filtros', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => [],
        });

        const { consultarSaldo } = require('../../src/services/estoqueClient');
        await expect(consultarSaldo({ produtoId: 'produto-1' })).rejects.toThrow('nao retornou saldo');
    });
});

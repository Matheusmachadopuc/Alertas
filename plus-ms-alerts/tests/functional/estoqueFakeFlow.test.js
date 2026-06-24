const http = require('http');
const { createApp } = require('../../../plus-ms-estoque-fake/src/app');

describe('fluxo funcional com MS Estoque fake', () => {
    let server;
    let baseUrl;

    beforeAll((done) => {
        server = http.createServer(createApp([
            { roupaId: 'roupa-001', produtoId: 'produto-001', tamanho: 'M', cor: 'Azul', saldo: 0 },
            { roupaId: 'roupa-002', produtoId: 'produto-001', tamanho: 'G', cor: 'Azul', saldo: 25 },
        ]));
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            baseUrl = `http://127.0.0.1:${port}`;
            done();
        });
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        jest.resetModules();
        process.env.ESTOQUE_API_URL = baseUrl;
    });

    it('consulta saldo, registra entrada e reflete novo saldo', async () => {
        const { consultarSaldo } = require('../../src/services/estoqueClient');

        const before = await consultarSaldo({ roupaId: 'roupa-001' });
        expect(before.saldo).toBe(0);

        const response = await fetch(`${baseUrl}/estoque/entrada`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roupaId: 'roupa-001',
                quantidade: 15,
                observacao: 'Entrada funcional',
            }),
        });

        expect(response.status).toBe(201);

        const after = await consultarSaldo({ roupaId: 'roupa-001' });
        expect(after.saldo).toBe(15);
    });

    it('usa o menor saldo da grade filtrada por produto', async () => {
        await fetch(`${baseUrl}/estoque`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roupaId: 'roupa-003',
                produtoId: 'produto-001',
                tamanho: 'M',
                cor: 'Azul',
            }),
        });

        const { consultarSaldo } = require('../../src/services/estoqueClient');
        const result = await consultarSaldo({
            produtoId: 'produto-001',
            tamanho: 'M',
            cor: 'Azul',
        });

        expect(result.saldo).toBe(0);
        expect(result.origem.roupaId).toBe('roupa-003');
    });

    it('reproduz erro de saldo insuficiente do MS4', async () => {
        const response = await fetch(`${baseUrl}/estoque/saida`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roupaId: 'roupa-001',
                quantidade: 999,
                observacao: 'Saida acima do saldo',
            }),
        });

        expect(response.status).toBe(422);
        await expect(response.json()).resolves.toMatchObject({ message: 'Saldo insuficiente' });
    });
});

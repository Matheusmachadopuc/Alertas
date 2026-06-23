const request = require('supertest');
const { signJwt } = require('../helpers/jwt');

jest.mock('../../src/services/alertaService', () => ({
    listar: jest.fn(),
    listarAtivos: jest.fn(),
    criar: jest.fn(),
    atualizarParcial: jest.fn(),
    remover: jest.fn(),
}));

jest.mock('../../src/services/alertaMonitor', () => ({
    verificarAlertas: jest.fn(),
}));

const alertaService = require('../../src/services/alertaService');
const app = require('../../src/app');

const adminToken = signJwt({
    sub: 'admin@teste.com',
    user_id: 1,
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 3600,
});

describe('Contrato HTTP de alertas', () => {
    it('retorna campos esperados para alerta ativo', async () => {
        alertaService.listarAtivos.mockResolvedValue([
            {
                id: 'a1',
                produtoId: 'produto-1',
                roupaId: 'roupa-1',
                produtoNome: 'Camiseta',
                categoria: 'Roupas',
                tamanho: 'M',
                cor: 'Azul',
                quantidadeMinima: 10,
                ativo: true,
                status: 'ATIVO',
                ultimoSaldo: 2,
            },
        ]);

        const response = await request(app)
            .get('/alerta/ativos')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body[0]).toEqual(expect.objectContaining({
            id: expect.any(String),
            produtoId: expect.any(String),
            quantidadeMinima: expect.any(Number),
            status: 'ATIVO',
            ultimoSaldo: expect.any(Number),
        }));
    });

    it('mantem erro padronizado em payload invalido', async () => {
        alertaService.criar.mockImplementation(() => {
            throw new Error('falha inesperada');
        });

        const response = await request(app)
            .post('/alerta')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ produtoId: 'produto-1' });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Erro interno do servidor' });
    });
});

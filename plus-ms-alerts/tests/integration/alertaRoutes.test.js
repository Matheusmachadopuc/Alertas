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
const { verificarAlertas } = require('../../src/services/alertaMonitor');
const app = require('../../src/app');

function bearer(role = 'admin') {
    const token = signJwt({
        sub: `${role}@teste.com`,
        user_id: `${role}-1`,
        role,
        exp: Math.floor(Date.now() / 1000) + 3600,
    });

    return `Bearer ${token}`;
}

describe('alertaRoutes', () => {
    it('exige autenticacao para consultar alertas ativos', async () => {
        const response = await request(app).get('/alerta/ativos');

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Token');
    });

    it('permite usuario autenticado listar alertas ativos', async () => {
        alertaService.listarAtivos.mockResolvedValue([{ id: 'a1', status: 'ATIVO' }]);

        const response = await request(app)
            .get('/alerta/ativos?categoria=Roupas&tamanho=M')
            .set('Authorization', bearer('vendedor'));

        expect(response.status).toBe(200);
        expect(response.body).toEqual([{ id: 'a1', status: 'ATIVO' }]);
        expect(alertaService.listarAtivos).toHaveBeenCalledWith(
            expect.objectContaining({ categoria: 'Roupas', tamanho: 'M' })
        );
    });

    it('bloqueia CRUD para usuario nao admin', async () => {
        const response = await request(app)
            .post('/alerta')
            .set('Authorization', bearer('vendedor'))
            .send({ produtoId: 'p1', quantidadeMinima: 10 });

        expect(response.status).toBe(403);
    });

    it('permite admin listar, criar, atualizar, remover e monitorar', async () => {
        alertaService.listar.mockResolvedValue([{ id: 'a1' }]);
        alertaService.criar.mockResolvedValue({ id: 'novo' });
        alertaService.atualizarParcial.mockResolvedValue({ id: 'novo', quantidadeMinima: 5 });
        alertaService.remover.mockResolvedValue();
        verificarAlertas.mockResolvedValue({ total: 1 });

        const admin = bearer('admin');

        await expect(request(app).get('/alerta').set('Authorization', admin))
            .resolves.toMatchObject({ status: 200, body: [{ id: 'a1' }] });

        await expect(request(app)
            .post('/alerta')
            .set('Authorization', admin)
            .send({ produtoId: 'p1', quantidadeMinima: 10 }))
            .resolves.toMatchObject({ status: 201, body: { id: 'novo' } });

        await expect(request(app)
            .patch('/alerta/novo')
            .set('Authorization', admin)
            .send({ quantidadeMinima: 5 }))
            .resolves.toMatchObject({ status: 200, body: { id: 'novo', quantidadeMinima: 5 } });

        await expect(request(app).delete('/alerta/novo').set('Authorization', admin))
            .resolves.toMatchObject({ status: 204 });

        await expect(request(app).post('/alerta/monitorar').set('Authorization', admin))
            .resolves.toMatchObject({ status: 200, body: { total: 1 } });
    });
});

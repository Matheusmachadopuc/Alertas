jest.mock('../../src/models/alertaModel', () => ({
    find: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
}));

const Alerta = require('../../src/models/alertaModel');
const alertaService = require('../../src/services/alertaService');

function mockSortedFind(result) {
    const sort = jest.fn().mockResolvedValue(result);
    Alerta.find.mockReturnValue({ sort });
    return sort;
}

describe('alertaService', () => {
    it('lista configuracoes com filtros permitidos', async () => {
        const sort = mockSortedFind([{ id: 'a1' }]);

        const result = await alertaService.listar({
            produtoId: 'p1',
            categoria: 'Roupas',
            tamanho: 'M',
            cor: 'Azul',
            status: 'OK',
            ativo: 'false',
            ignorado: 'x',
        });

        expect(Alerta.find).toHaveBeenCalledWith({
            produtoId: 'p1',
            categoria: 'Roupas',
            tamanho: 'M',
            cor: 'Azul',
            status: 'OK',
            ativo: false,
        });
        expect(sort).toHaveBeenCalledWith({ atualizadoEm: -1 });
        expect(result).toEqual([{ id: 'a1' }]);
    });

    it('lista apenas alertas ativos disparados', async () => {
        mockSortedFind([{ id: 'ativo' }]);

        await alertaService.listarAtivos({ categoria: 'Roupas' });

        expect(Alerta.find).toHaveBeenCalledWith({
            categoria: 'Roupas',
            ativo: true,
            status: 'ATIVO',
        });
    });

    it('mantem filtros vazios fora da consulta e aceita ativo true', async () => {
        mockSortedFind([]);

        await alertaService.listar({
            produtoId: '',
            categoria: null,
            tamanho: undefined,
            ativo: 'true',
        });

        expect(Alerta.find).toHaveBeenCalledWith({ ativo: true });
    });

    it('cria alerta com usuario responsavel', async () => {
        Alerta.create.mockResolvedValue({ id: 'novo' });

        const result = await alertaService.criar(
            { produtoId: 'p1', quantidadeMinima: 4 },
            { email: 'admin@teste.com' }
        );

        expect(Alerta.create).toHaveBeenCalledWith(expect.objectContaining({
            produtoId: 'p1',
            quantidadeMinima: 4,
            criadoPor: 'admin@teste.com',
            atualizadoPor: 'admin@teste.com',
        }));
        expect(result).toEqual({ id: 'novo' });
    });

    it('cria alerta usando id quando email nao existe', async () => {
        Alerta.create.mockResolvedValue({ id: 'novo' });

        await alertaService.criar(
            { produtoId: 'p1', quantidadeMinima: 4 },
            { id: 'admin-1' }
        );

        expect(Alerta.create).toHaveBeenCalledWith(expect.objectContaining({
            criadoPor: 'admin-1',
            atualizadoPor: 'admin-1',
        }));
    });

    it('atualiza alerta existente', async () => {
        Alerta.findOneAndUpdate.mockResolvedValue({ id: 'a1', quantidadeMinima: 8 });

        const result = await alertaService.atualizarParcial(
            'a1',
            { quantidadeMinima: 8 },
            { id: 'admin-1' }
        );

        expect(Alerta.findOneAndUpdate).toHaveBeenCalledWith(
            { id: 'a1' },
            expect.objectContaining({ quantidadeMinima: 8, atualizadoPor: 'admin-1' }),
            { new: true, runValidators: true }
        );
        expect(result.quantidadeMinima).toBe(8);
    });

    it('retorna 404 ao atualizar alerta inexistente', async () => {
        Alerta.findOneAndUpdate.mockResolvedValue(null);

        await expect(alertaService.atualizarParcial('a1', { quantidadeMinima: 8 }))
            .rejects.toMatchObject({ statusCode: 404 });
    });

    it('remove alerta existente ou retorna 404', async () => {
        Alerta.findOneAndDelete.mockResolvedValueOnce({ id: 'a1' });
        await expect(alertaService.remover('a1')).resolves.toBeUndefined();

        Alerta.findOneAndDelete.mockResolvedValueOnce(null);
        await expect(alertaService.remover('a2')).rejects.toMatchObject({ statusCode: 404 });
    });
});

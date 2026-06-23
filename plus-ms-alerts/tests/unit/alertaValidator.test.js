const { validateCreate, validatePatch } = require('../../src/validators/alertaValidator');

describe('alertaValidator', () => {
    it('normaliza uma configuracao valida de alerta', () => {
        const payload = validateCreate({
            produtoId: ' produto-1 ',
            roupaId: ' roupa-1 ',
            produtoNome: ' Camiseta ',
            categoria: ' Roupas ',
            tamanho: ' M ',
            cor: ' Azul ',
            quantidadeMinima: '10',
            ativo: true,
        });

        expect(payload).toEqual({
            produtoId: 'produto-1',
            roupaId: 'roupa-1',
            produtoNome: 'Camiseta',
            categoria: 'Roupas',
            tamanho: 'M',
            cor: 'Azul',
            quantidadeMinima: 10,
            ativo: true,
        });
    });

    it('exige produtoId e quantidadeMinima ao criar', () => {
        expect(() => validateCreate({ quantidadeMinima: 1 })).toThrow('produtoId');
        expect(() => validateCreate({ produtoId: 'produto-1' })).toThrow('quantidadeMinima');
    });

    it('rejeita quantidadeMinima negativa ou invalida', () => {
        expect(() => validateCreate({ produtoId: 'produto-1', quantidadeMinima: -1 }))
            .toThrow('quantidadeMinima');
        expect(() => validateCreate({ produtoId: 'produto-1', quantidadeMinima: 'abc' }))
            .toThrow('quantidadeMinima');
    });

    it('permite patch parcial com campos conhecidos', () => {
        expect(validatePatch({ quantidadeMinima: 5 })).toEqual({ quantidadeMinima: 5 });
        expect(validatePatch({ ativo: false })).toEqual({ ativo: false });
    });

    it('rejeita patch vazio ou produtoId vazio', () => {
        expect(() => validatePatch({ campoIgnorado: true })).toThrow('campo valido');
        expect(() => validatePatch({ produtoId: '   ' })).toThrow('produtoId');
    });
});

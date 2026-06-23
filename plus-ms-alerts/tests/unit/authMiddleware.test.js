const { signJwt } = require('../helpers/jwt');
const { authenticate, requireAdmin } = require('../../src/middlewares/authMiddleware');

function unsignedToken(header, payload) {
    return [
        Buffer.from(JSON.stringify(header)).toString('base64url'),
        Buffer.from(JSON.stringify(payload)).toString('base64url'),
        'assinatura',
    ].join('.');
}

function reqWithToken(payload, scheme = 'Bearer') {
    return {
        headers: {
            authorization: `${scheme} ${signJwt(payload)}`,
        },
    };
}

function runAuthenticate(req) {
    const next = jest.fn();
    authenticate(req, {}, next);
    return next;
}

describe('authMiddleware', () => {
    it('autentica JWT valido e normaliza usuario', () => {
        const req = reqWithToken({
            sub: 'admin@teste.com',
            user_id: 10,
            role: 'admin',
            exp: Math.floor(Date.now() / 1000) + 3600,
        });

        const next = runAuthenticate(req);

        expect(next).toHaveBeenCalledWith();
        expect(req.user).toEqual(expect.objectContaining({
            id: 10,
            email: 'admin@teste.com',
            roles: ['ADMIN'],
        }));
    });

    it('rejeita ausencia, formato invalido, expiracao e assinatura invalida', () => {
        const noAuth = runAuthenticate({ headers: {} });
        expect(noAuth.mock.calls[0][0]).toMatchObject({ statusCode: 401 });

        const wrongScheme = runAuthenticate(reqWithToken({ sub: 'u' }, 'Token'));
        expect(wrongScheme.mock.calls[0][0]).toMatchObject({ statusCode: 401 });

        const expired = runAuthenticate(reqWithToken({
            sub: 'u',
            role: 'admin',
            exp: Math.floor(Date.now() / 1000) - 1,
        }));
        expect(expired.mock.calls[0][0]).toMatchObject({ statusCode: 401 });

        const token = signJwt({ sub: 'u', role: 'admin' }).replace(/\w$/, 'x');
        const invalid = runAuthenticate({ headers: { authorization: `Bearer ${token}` } });
        expect(invalid.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    });

    it('rejeita token mal formado, algoritmo nao permitido e nbf futuro', () => {
        const malformed = runAuthenticate({ headers: { authorization: 'Bearer abc.def.ghi' } });
        expect(malformed.mock.calls[0][0]).toMatchObject({ statusCode: 401 });

        const unsupportedAlg = runAuthenticate({
            headers: {
                authorization: `Bearer ${unsignedToken({ alg: 'HS512' }, { sub: 'u' })}`,
            },
        });
        expect(unsupportedAlg.mock.calls[0][0]).toMatchObject({ statusCode: 401 });

        const future = runAuthenticate(reqWithToken({
            sub: 'u',
            role: 'admin',
            nbf: Math.floor(Date.now() / 1000) + 3600,
        }));
        expect(future.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    });

    it('extrai roles de arrays e listas separadas por virgula', () => {
        const req = reqWithToken({
            email: 'gestor@teste.com',
            id: 'gestor-1',
            roles: ['vendedor, admin'],
        });

        const next = runAuthenticate(req);

        expect(next).toHaveBeenCalledWith();
        expect(req.user.roles).toEqual(['VENDEDOR', 'ADMIN']);
        expect(req.user.email).toBe('gestor@teste.com');
    });

    it('valida role admin e bloqueia usuario comum', () => {
        const adminNext = jest.fn();
        requireAdmin({ user: { roles: ['VENDEDOR', 'ADMIN'] } }, {}, adminNext);
        expect(adminNext).toHaveBeenCalledWith();

        const userNext = jest.fn();
        requireAdmin({ user: { roles: ['VENDEDOR'] } }, {}, userNext);
        expect(userNext.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
    });
});

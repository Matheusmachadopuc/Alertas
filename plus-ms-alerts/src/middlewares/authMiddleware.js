const crypto = require('crypto');
const authConfig = require('../config/auth');
const AppError = require('../errors/AppError');

function base64UrlToBuffer(value) {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);

    return Buffer.from(`${base64}${padding}`, 'base64');
}

function parseJwtPart(value) {
    return JSON.parse(base64UrlToBuffer(value).toString('utf8'));
}

function verifySignature(token, header) {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    const data = `${encodedHeader}.${encodedPayload}`;

    if (header.alg === 'HS256') {
        const expectedSignature = crypto
            .createHmac('sha256', authConfig.jwtSecretOrPublicKey)
            .update(data)
            .digest('base64url');

        const received = Buffer.from(signature);
        const expected = Buffer.from(expectedSignature);

        return received.length === expected.length && crypto.timingSafeEqual(received, expected);
    }

    if (header.alg === 'RS256') {
        return crypto.verify(
            'RSA-SHA256',
            Buffer.from(data),
            authConfig.jwtSecretOrPublicKey,
            base64UrlToBuffer(signature)
        );
    }

    throw new AppError('Algoritmo JWT nao suportado pelo MS Alerts', 401);
}

function validateClaims(payload) {
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
        throw new AppError('Token de acesso expirado', 401);
    }

    if (payload.nbf && payload.nbf > now) {
        throw new AppError('Token de acesso ainda nao e valido', 401);
    }

    if (authConfig.jwtIssuer && payload.iss !== authConfig.jwtIssuer) {
        throw new AppError('Emissor do token invalido', 401);
    }

    if (authConfig.jwtAudience) {
        const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

        if (!audiences.includes(authConfig.jwtAudience)) {
            throw new AppError('Audiencia do token invalida', 401);
        }
    }
}

function verifyJwt(token) {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !signature) {
        throw new AppError('Token JWT mal formado', 401);
    }

    const header = parseJwtPart(encodedHeader);
    const payload = parseJwtPart(encodedPayload);

    if (!authConfig.jwtAlgorithms.includes(header.alg)) {
        throw new AppError('Algoritmo JWT nao permitido', 401);
    }

    if (!verifySignature(token, header)) {
        throw new AppError('Assinatura do token invalida', 401);
    }

    validateClaims(payload);
    return payload;
}

function extractToken(req) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        throw new AppError('Token de acesso nao informado', 401);
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
        throw new AppError('Formato do token invalido', 401);
    }

    return token;
}

function getUserRoles(payload) {
    const claimValue = payload.roles || payload.role || payload.perfis || payload.perfil || payload.tipo;
    const roles = Array.isArray(claimValue) ? claimValue : [claimValue];

    return roles
        .filter(Boolean)
        .flatMap((role) => String(role).split(','))
        .map((role) => role.trim().toUpperCase())
        .filter(Boolean);
}

function authenticate(req, res, next) {
    try {
        if (!authConfig.jwtSecretOrPublicKey) {
            throw new AppError('Configuracao JWT ausente no MS Alerts', 500);
        }

        const payload = verifyJwt(extractToken(req));

        req.user = {
            id: payload.sub || payload.id || payload.userId,
            email: payload.email,
            roles: getUserRoles(payload),
            raw: payload,
        };

        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
            return;
        }

        next(new AppError('Token de acesso invalido ou expirado', 401));
    }
}

function requireAdmin(req, res, next) {
    const userRoles = req.user?.roles || [];
    const adminRoles = authConfig.adminRoles.map((role) => role.toUpperCase());
    const isAdmin = userRoles.some((role) => adminRoles.includes(role));

    if (!isAdmin) {
        next(new AppError('Acesso permitido apenas para administradores', 403));
        return;
    }

    next();
}

module.exports = {
    authenticate,
    requireAdmin,
};

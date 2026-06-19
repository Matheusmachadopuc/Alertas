const DEFAULT_ADMIN_ROLES = ['ADMIN', 'ADM'];

function parseList(value, fallback = []) {
    if (!value) {
        return fallback;
    }

    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function getJwtSecretOrPublicKey() {
    if (process.env.JWT_PUBLIC_KEY) {
        return process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
    }

    return process.env.JWT_SECRET;
}

module.exports = {
    jwtSecretOrPublicKey: getJwtSecretOrPublicKey(),
    jwtAlgorithms: parseList(process.env.JWT_ALGORITHMS, ['HS256']),
    jwtIssuer: process.env.JWT_ISSUER || undefined,
    jwtAudience: process.env.JWT_AUDIENCE || undefined,
    adminRoles: parseList(process.env.ADMIN_ROLES, DEFAULT_ADMIN_ROLES),
};

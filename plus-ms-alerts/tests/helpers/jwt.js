const crypto = require('crypto');

function base64url(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signJwt(payload, secret = 'dev-secret') {
    const encodedHeader = base64url({ alg: 'HS256', typ: 'JWT' });
    const encodedPayload = base64url(payload);
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64url');

    return `${data}.${signature}`;
}

module.exports = {
    signJwt,
};

const { randomUUID } = require('crypto');

function send(res, statusCode, payload) {
    const body = payload === undefined ? '' : JSON.stringify(payload);

    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    });
    res.end(body);
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
    });
}

function normalizeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function createState(initial = []) {
    const estoque = new Map();
    const movimentos = [];

    initial.forEach((item) => {
        const roupaId = item.roupaId || randomUUID();
        estoque.set(roupaId, {
            roupaId,
            produtoId: item.produtoId,
            tamanho: item.tamanho,
            cor: item.cor,
            saldo: normalizeNumber(item.saldo),
        });
    });

    return { estoque, movimentos };
}

function addMovimento(state, tipo, item, quantidade, observacao) {
    const movimento = {
        id: randomUUID(),
        roupaId: item.roupaId,
        produtoId: item.produtoId,
        tipo,
        quantidade,
        saldoAtual: item.saldo,
        observacao: observacao || '',
        criadoEm: new Date().toISOString(),
    };

    state.movimentos.push(movimento);
    return movimento;
}

function listByProduto(state, produtoId, filters) {
    return Array.from(state.estoque.values())
        .filter((item) => item.produtoId === produtoId)
        .filter((item) => !filters.tamanho || item.tamanho === filters.tamanho)
        .filter((item) => !filters.cor || item.cor === filters.cor);
}

function createApp(initial = []) {
    const state = createState(initial);

    return async function app(req, res) {
        if (req.method === 'OPTIONS') {
            send(res, 204);
            return;
        }

        const url = new URL(req.url, 'http://localhost');
        const parts = url.pathname.split('/').filter(Boolean);

        try {
            if (req.method === 'GET' && url.pathname === '/health') {
                send(res, 200, { status: 'ok', service: 'plus-ms-estoque-fake' });
                return;
            }

            if (req.method === 'POST' && url.pathname === '/estoque') {
                const body = await readJson(req);

                if (!body.roupaId || !body.produtoId) {
                    send(res, 400, { message: 'roupaId e produtoId sao obrigatorios' });
                    return;
                }

                const item = {
                    roupaId: body.roupaId,
                    produtoId: body.produtoId,
                    tamanho: body.tamanho || '',
                    cor: body.cor || '',
                    saldo: 0,
                };

                state.estoque.set(item.roupaId, item);
                addMovimento(state, 'CADASTRO', item, 0, 'Cadastro inicial');
                send(res, 201, item);
                return;
            }

            if (req.method === 'GET' && url.pathname === '/estoque') {
                const produtoId = url.searchParams.get('produtoId');
                const items = Array.from(state.estoque.values())
                    .filter((item) => !produtoId || item.produtoId === produtoId);

                send(res, 200, items);
                return;
            }

            if (req.method === 'GET' && parts[0] === 'estoque' && parts[1] === 'produto' && parts[2]) {
                send(res, 200, listByProduto(state, parts[2], {
                    tamanho: url.searchParams.get('tamanho'),
                    cor: url.searchParams.get('cor'),
                }));
                return;
            }

            if (req.method === 'GET' && parts[0] === 'estoque' && parts[1] && parts[2] === 'movimentos') {
                const history = state.movimentos
                    .filter((movimento) => movimento.roupaId === parts[1])
                    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

                send(res, 200, history);
                return;
            }

            if (req.method === 'GET' && parts[0] === 'estoque' && parts[1]) {
                const item = state.estoque.get(parts[1]);

                if (!item) {
                    send(res, 404, { message: 'Roupa nao encontrada' });
                    return;
                }

                send(res, 200, item);
                return;
            }

            if (req.method === 'POST' && ['/estoque/entrada', '/estoque/saida'].includes(url.pathname)) {
                const body = await readJson(req);
                const item = state.estoque.get(body.roupaId);
                const quantidade = normalizeNumber(body.quantidade);

                if (!item) {
                    send(res, 404, { message: 'Roupa nao encontrada' });
                    return;
                }

                if (quantidade <= 0) {
                    send(res, 400, { message: 'Quantidade deve ser positiva' });
                    return;
                }

                if (url.pathname === '/estoque/saida' && item.saldo < quantidade) {
                    send(res, 422, { message: 'Saldo insuficiente' });
                    return;
                }

                item.saldo += url.pathname === '/estoque/entrada' ? quantidade : -quantidade;
                const movimento = addMovimento(
                    state,
                    url.pathname === '/estoque/entrada' ? 'ENTRADA' : 'SAIDA',
                    item,
                    quantidade,
                    body.observacao
                );

                send(res, 201, { estoque: item, movimento });
                return;
            }

            if (req.method === 'PATCH' && parts[0] === 'estoque' && parts[1] && parts[2] === 'ajuste') {
                const body = await readJson(req);
                const item = state.estoque.get(parts[1]);

                if (!item) {
                    send(res, 404, { message: 'Roupa nao encontrada' });
                    return;
                }

                item.saldo = normalizeNumber(body.quantidade);
                const movimento = addMovimento(state, 'AJUSTE', item, item.saldo, body.observacao);
                send(res, 200, { estoque: item, movimento });
                return;
            }

            send(res, 404, { message: 'Rota nao encontrada' });
        } catch (error) {
            send(res, 400, { message: error.message });
        }
    };
}

module.exports = {
    createApp,
};

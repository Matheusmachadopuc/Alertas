const AppError = require('../errors/AppError');

const DEFAULT_ESTOQUE_API_URL = 'http://localhost:3000';
const REQUEST_TIMEOUT_MS = Number(process.env.ESTOQUE_TIMEOUT_MS || 8000);

function getBaseUrl() {
    return (process.env.ESTOQUE_API_URL || DEFAULT_ESTOQUE_API_URL).replace(/\/$/, '');
}

function buildUrl(path, query = {}) {
    const url = new URL(`${getBaseUrl()}${path}`);

    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });

    return url;
}

async function requestJson(path, query) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(buildUrl(path, query), {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new AppError(`MS Estoque retornou status ${response.status}`, 502);
        }

        return response.json();
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(`Nao foi possivel consultar o MS Estoque: ${error.message}`, 502);
    } finally {
        clearTimeout(timeout);
    }
}

function asArray(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.items)) {
        return payload.items;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    if (Array.isArray(payload?.estoque)) {
        return payload.estoque;
    }

    return payload ? [payload] : [];
}

function extrairSaldo(item) {
    const value = item?.saldo
        ?? item?.quantidade
        ?? item?.quantidadeAtual
        ?? item?.estoque
        ?? item?.saldoAtual;

    const saldo = Number(value);
    return Number.isFinite(saldo) ? saldo : 0;
}

function itemMatches(alerta, item) {
    if (alerta.roupaId && item.roupaId && String(item.roupaId) !== alerta.roupaId) {
        return false;
    }

    if (alerta.produtoId && item.produtoId && String(item.produtoId) !== alerta.produtoId) {
        return false;
    }

    if (alerta.tamanho && item.tamanho && String(item.tamanho).toUpperCase() !== alerta.tamanho.toUpperCase()) {
        return false;
    }

    if (alerta.cor && item.cor && String(item.cor).toUpperCase() !== alerta.cor.toUpperCase()) {
        return false;
    }

    return true;
}

async function consultarSaldo(alerta) {
    if (alerta.roupaId) {
        const item = await requestJson(`/estoque/${encodeURIComponent(alerta.roupaId)}`);
        return {
            saldo: extrairSaldo(item),
            origem: item,
        };
    }

    const itens = asArray(await requestJson(
        `/estoque/produto/${encodeURIComponent(alerta.produtoId)}`,
        {
            tamanho: alerta.tamanho,
            cor: alerta.cor,
        }
    )).filter((item) => itemMatches(alerta, item));

    if (itens.length === 0) {
        throw new AppError('MS Estoque nao retornou saldo para os filtros do alerta', 404);
    }

    const itemCritico = itens
        .map((item) => ({ item, saldo: extrairSaldo(item) }))
        .sort((a, b) => a.saldo - b.saldo)[0];

    return {
        saldo: itemCritico.saldo,
        origem: itemCritico.item,
    };
}

module.exports = {
    consultarSaldo,
};

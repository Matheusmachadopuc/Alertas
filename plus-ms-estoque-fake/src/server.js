const http = require('http');
const { createApp } = require('./app');

if (process.argv.includes('--check')) {
    console.log('plus-ms-estoque-fake ok');
    process.exit(0);
}

const port = Number(process.env.PORT || 3000);
const initial = process.env.FAKE_ESTOQUE_SEED
    ? JSON.parse(process.env.FAKE_ESTOQUE_SEED)
    : [
        { roupaId: 'roupa-001', produtoId: 'produto-001', tamanho: 'M', cor: 'Azul', saldo: 0 },
        { roupaId: 'roupa-002', produtoId: 'produto-002', tamanho: 'G', cor: 'Azul', saldo: 25 },
    ];

const server = http.createServer(createApp(initial));

server.listen(port, '0.0.0.0', () => {
    console.log(`MS Estoque fake rodando em http://localhost:${port}`);
});

const express = require('express');

const alertaRoutes = require('./routes/alertaRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use((req, res, next) => {
    const origins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'];
    const requestOrigin = req.headers.origin;
    const allowedOrigin = origins.includes('*') || !requestOrigin
        ? '*'
        : origins.find((origin) => origin.trim() === requestOrigin);

    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send();
        return;
    }

    next();
});
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'plus-ms-alerts' });
});

app.use('/', alertaRoutes);
app.use(errorHandler);

module.exports = app;

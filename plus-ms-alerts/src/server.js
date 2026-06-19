const app = require('./app');
const connectDatabase = require('./config/database');

const PORT = process.env.PORT || 3002;

connectDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`MS Alerts rodando em http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Falha ao conectar ao banco de dados:', error.message);
        process.exit(1);
    });

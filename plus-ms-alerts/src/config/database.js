const mongoose = require('mongoose');

const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/api-alertas';
const MAX_RETRIES = Number(process.env.MONGODB_RETRIES || 5);
const RETRY_DELAY_MS = Number(process.env.MONGODB_RETRY_DELAY_MS || 2000);

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectDatabase() {
    const mongoUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

    mongoose.set('strictQuery', true);

    for (let tentativa = 1; tentativa <= MAX_RETRIES; tentativa += 1) {
        try {
            await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
            console.log('MongoDB conectado');
            return;
        } catch (error) {
            if (tentativa === MAX_RETRIES) {
                throw error;
            }

            console.warn(`MongoDB indisponivel. Tentativa ${tentativa}/${MAX_RETRIES}.`);
            await wait(RETRY_DELAY_MS);
        }
    }
}

module.exports = connectDatabase;

function errorHandler(error, req, res, next) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Erro interno do servidor' : error.message;

    if (statusCode === 500) {
        console.error(error);
    }

    res.status(statusCode).json({ message });
}

module.exports = errorHandler;

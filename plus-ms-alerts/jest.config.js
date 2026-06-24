module.exports = {
    testEnvironment: 'node',
    clearMocks: true,
    setupFiles: ['<rootDir>/tests/setupEnv.js'],
    collectCoverageFrom: [
        'src/controllers/**/*.js',
        'src/middlewares/**/*.js',
        'src/services/**/*.js',
        'src/validators/**/*.js',
        '!src/server.js',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 85,
            lines: 85,
            statements: 85,
        },
    },
};

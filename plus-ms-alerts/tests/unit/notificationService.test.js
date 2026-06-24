const mockSend = jest.fn();

jest.mock('@aws-sdk/client-sns', () => ({
    SNSClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PublishCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const {
    notificarAlertaEstoque,
    resetNotificationClientForTests,
} = require('../../src/services/notificationService');

function alerta(overrides = {}) {
    return {
        id: 'alerta-1',
        produtoId: 'produto-1',
        roupaId: 'roupa-1',
        produtoNome: 'Camiseta',
        categoria: 'Roupas',
        tamanho: 'M',
        cor: 'Azul',
        quantidadeMinima: 10,
        mensagem: 'Camiseta atingiu saldo 4, limiar 10',
        ...overrides,
    };
}

describe('notificationService', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        resetNotificationClientForTests();
        process.env = {
            ...originalEnv,
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_DEFAULT_REGION: 'us-east-1',
        };
        delete process.env.ALERTS_NOTIFICATION_TOPIC_ARN;
        delete process.env.AWS_ENDPOINT_URL;
        delete process.env.AWS_ENDPOINT;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('ignora envio quando topico nao esta configurado', async () => {
        const result = await notificarAlertaEstoque(alerta(), 4);

        expect(result).toEqual({
            skipped: true,
            reason: 'ALERTS_NOTIFICATION_TOPIC_ARN nao configurado',
        });
        expect(mockSend).not.toHaveBeenCalled();
    });

    it('publica alerta de estoque baixo no SNS configurado', async () => {
        process.env.ALERTS_NOTIFICATION_TOPIC_ARN = 'arn:aws:sns:us-east-1:000000000000:alertas-estoque';
        process.env.AWS_ENDPOINT_URL = 'http://localstack:4566';
        mockSend.mockResolvedValue({ MessageId: 'sns-message-1' });

        const result = await notificarAlertaEstoque(alerta(), 4);

        expect(SNSClient).toHaveBeenCalledWith(expect.objectContaining({
            region: 'us-east-1',
            endpoint: 'http://localstack:4566',
        }));
        expect(PublishCommand).toHaveBeenCalledWith(expect.objectContaining({
            TopicArn: process.env.ALERTS_NOTIFICATION_TOPIC_ARN,
            Subject: 'Alerta de estoque baixo',
            MessageAttributes: expect.objectContaining({
                tipo: expect.objectContaining({ StringValue: 'ALERTA_ESTOQUE_BAIXO' }),
                alertaId: expect.objectContaining({ StringValue: 'alerta-1' }),
            }),
        }));

        const message = JSON.parse(PublishCommand.mock.calls[0][0].Message);
        expect(message).toMatchObject({
            tipo: 'ALERTA_ESTOQUE_BAIXO',
            alertaId: 'alerta-1',
            saldo: 4,
            quantidadeMinima: 10,
        });
        expect(result).toMatchObject({
            messageId: 'sns-message-1',
            payload: {
                alertaId: 'alerta-1',
            },
        });
    });

    it('usa fallbacks de ambiente e reaproveita o client SNS', async () => {
        process.env.ALERTS_NOTIFICATION_TOPIC_ARN = 'arn:aws:sns:us-east-1:000000000000:alertas-estoque';
        process.env.AWS_ENDPOINT = 'http://ministack:4566';
        delete process.env.AWS_ACCESS_KEY_ID;
        delete process.env.AWS_SECRET_ACCESS_KEY;
        delete process.env.AWS_DEFAULT_REGION;
        mockSend
            .mockResolvedValueOnce({ MessageId: 'sns-message-1' })
            .mockResolvedValueOnce({ MessageId: 'sns-message-2' });

        await notificarAlertaEstoque(alerta({
            roupaId: '',
            produtoNome: '',
            categoria: '',
            tamanho: '',
            cor: '',
        }), 3);
        await notificarAlertaEstoque(alerta(), 2);

        expect(SNSClient).toHaveBeenCalledTimes(1);
        expect(SNSClient).toHaveBeenCalledWith(expect.objectContaining({
            region: 'us-east-1',
            endpoint: 'http://ministack:4566',
            credentials: {
                accessKeyId: 'test',
                secretAccessKey: 'test',
            },
        }));

        const message = JSON.parse(PublishCommand.mock.calls[0][0].Message);
        expect(message).toMatchObject({
            roupaId: null,
            produtoNome: null,
            categoria: null,
            tamanho: null,
            cor: null,
        });
    });
});

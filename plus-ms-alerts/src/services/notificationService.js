const { PublishCommand, SNSClient } = require('@aws-sdk/client-sns');

let snsClient = null;

function notificationsEnabled() {
    return Boolean(process.env.ALERTS_NOTIFICATION_TOPIC_ARN);
}

function getSnsClient() {
    if (!snsClient) {
        snsClient = new SNSClient({
            region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
            endpoint: process.env.AWS_ENDPOINT_URL || process.env.AWS_ENDPOINT,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
            },
        });
    }

    return snsClient;
}

function montarPayload(alerta, saldo) {
    return {
        tipo: 'ALERTA_ESTOQUE_BAIXO',
        alertaId: alerta.id,
        produtoId: alerta.produtoId,
        roupaId: alerta.roupaId || null,
        produtoNome: alerta.produtoNome || null,
        categoria: alerta.categoria || null,
        tamanho: alerta.tamanho || null,
        cor: alerta.cor || null,
        saldo,
        quantidadeMinima: alerta.quantidadeMinima,
        mensagem: alerta.mensagem,
        ocorridoEm: new Date().toISOString(),
    };
}

async function notificarAlertaEstoque(alerta, saldo) {
    if (!notificationsEnabled()) {
        return { skipped: true, reason: 'ALERTS_NOTIFICATION_TOPIC_ARN nao configurado' };
    }

    const payload = montarPayload(alerta, saldo);

    const result = await getSnsClient().send(new PublishCommand({
        TopicArn: process.env.ALERTS_NOTIFICATION_TOPIC_ARN,
        Subject: 'Alerta de estoque baixo',
        Message: JSON.stringify(payload),
        MessageAttributes: {
            tipo: {
                DataType: 'String',
                StringValue: payload.tipo,
            },
            alertaId: {
                DataType: 'String',
                StringValue: payload.alertaId,
            },
        },
    }));

    return {
        messageId: result.MessageId,
        payload,
    };
}

function resetNotificationClientForTests() {
    snsClient = null;
}

module.exports = {
    notificarAlertaEstoque,
    resetNotificationClientForTests,
};

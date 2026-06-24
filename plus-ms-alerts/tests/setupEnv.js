process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
process.env.JWT_ALGORITHMS = process.env.JWT_ALGORITHMS || 'HS256';
process.env.ADMIN_ROLES = process.env.ADMIN_ROLES || 'ADMIN,ADM,admin';
process.env.ESTOQUE_API_URL = process.env.ESTOQUE_API_URL || 'http://localhost:3004';
process.env.ALERTS_MONITOR_INTERVAL_MS = process.env.ALERTS_MONITOR_INTERVAL_MS || '60000';
delete process.env.ALERTS_NOTIFICATION_TOPIC_ARN;

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
    user: process.env.RABBITMQ_USER || 'admin',
    pass: process.env.RABBITMQ_PASS || 'admin',
    vhost: process.env.RABBITMQ_VHOST || '/',
    exchange: process.env.EXCHANGE_NAME || 'exchange_pedido',
    queue: process.env.QUEUE_NAME || 'queue_pedido',
    routingKey: process.env.ROUTING_KEY || 'routing_key_pedido',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'pedidos_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
};

export function validateConfig() {
  const required = [
    'rabbitmq.host',
    'rabbitmq.port',
    'rabbitmq.user',
    'rabbitmq.pass',
    'database.host',
    'database.port',
    'database.database',
    'database.user',
    'database.password',
  ];

  const missing = required.filter((key) => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], config);
    return value === undefined || value === '';
  });

  if (missing.length > 0) {
    throw new Error(`Configurações obrigatórias ausentes: ${missing.join(', ')}`);
  }
}

export default config;

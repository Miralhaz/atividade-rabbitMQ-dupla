import amqp from 'amqplib';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let connection = null;
let channel = null;

export async function connectRabbitMQ() {
  if (connection && channel) {
    return { connection, channel };
  }

  const { host, port, user, pass, vhost } = config.rabbitmq;
  const url = `amqp://${user}:${pass}@${host}:${port}${vhost}`;

  try {
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    connection.on('error', (err) => {
      logger.error('Erro na conexão RabbitMQ:', err.message);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      logger.warn('Conexão RabbitMQ fechada');
      connection = null;
      channel = null;
    });

    logger.info('Conectado ao RabbitMQ com sucesso');
    return { connection, channel };
  } catch (error) {
    logger.error('Falha ao conectar ao RabbitMQ:', error.message);
    throw error;
  }
}

export async function setupTopology(channel) {
  const { exchange, queue, routingKey } = config.rabbitmq;

  await channel.assertExchange(exchange, 'direct', { durable: true });
  logger.info(`Exchange '${exchange}' declarada`);

  await channel.assertQueue(queue, { durable: true });
  logger.info(`Fila '${queue}' declarada`);

  await channel.bindQueue(queue, exchange, routingKey);
  logger.info(`Binding criado: ${queue} -> ${exchange} (${routingKey})`);

  await channel.prefetch(10);
  logger.info('Prefetch configurado para 10 mensagens');
}

export function getChannel() {
  if (!channel) {
    throw new Error('Canal RabbitMQ não inicializado. Chame connectRabbitMQ() primeiro.');
  }
  return channel;
}

export async function closeRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('Conexão RabbitMQ fechada com sucesso');
  } catch (error) {
    logger.error('Erro ao fechar conexão RabbitMQ:', error.message);
  }
}

export { connection, channel };

import { getChannel } from '../rabbitmq/connection.js';
import { processarPedidoCompleto } from '../db/queries.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export async function startConsumer() {
  const channel = getChannel();
  const { queue } = config.rabbitmq;

  await channel.consume(queue, async (msg) => {
    if (!msg) {
      logger.warn('Mensagem nula recebida (consumer cancelado)');
      return;
    }

    const messageId = msg.properties.messageId || 'unknown';
    const correlationId = msg.properties.correlationId || 'unknown';

    logger.info(`Mensagem recebida [${messageId}] correlationId: ${correlationId}`);

    try {
      const content = msg.content.toString('utf-8');
      logger.debug('Conteúdo da mensagem:', content);

      let evento;
      try {
        evento = JSON.parse(content);
      } catch (parseError) {
        logger.error('Erro ao fazer parse do JSON:', parseError.message);
        channel.nack(msg, false, false);
        return;
      }

      if (!validarEvento(evento)) {
        logger.error('Evento inválido - campos obrigatórios ausentes', { evento });
        channel.nack(msg, false, false);
        return;
      }

      await processarPedidoCompleto(evento);

      channel.ack(msg);
      logger.info(`Mensagem [${messageId}] processada e confirmada (ACK)`);
    } catch (error) {
      logger.error(`Erro ao processar mensagem [${messageId}]:`, error.message);
      channel.nack(msg, false, true);
    }
  });

  logger.info(`Consumer iniciado na fila '${queue}'`);
}

function validarEvento(evento) {
  if (!evento || typeof evento !== 'object') return false;
  if (!evento.eventId || typeof evento.eventId !== 'string') return false;
  if (!evento.tipoEvento || typeof evento.tipoEvento !== 'string') return false;
  if (!evento.ocorridoEm) return false;
  if (!evento.pedidoId || typeof evento.pedidoId !== 'number') return false;
  if (!Array.isArray(evento.itens)) return false;

  for (const item of evento.itens) {
    if (!item.produtoId || typeof item.produtoId !== 'number') return false;
    if (!item.quantidade || typeof item.quantidade !== 'number') return false;
  }

  return true;
}

export async function stopConsumer() {
  const channel = getChannel();
  await channel.cancel('consumer-tag');
  logger.info('Consumer parado');
}

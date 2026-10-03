import { query, getClient } from './connection.js';
import { logger } from '../utils/logger.js';

export async function savePedido(pedidoId, criadoEm, status = 'RECEBIDO') {
  const text = `
    INSERT INTO pedido (id, criado_em, status)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status
    RETURNING id
  `;
  const result = await query(text, [pedidoId, criadoEm, status]);
  return result.rows[0];
}

export async function saveItensPedido(pedidoId, itens) {
  if (!itens || itens.length === 0) return [];

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const savedItens = [];
    for (const item of itens) {
      const text = `
        INSERT INTO item_pedido (pedido_id, produto_id, quantidade)
        VALUES ($1, $2, $3)
        RETURNING id, pedido_id, produto_id, quantidade
      `;
      const result = await client.query(text, [pedidoId, item.produtoId, item.quantidade]);
      savedItens.push(result.rows[0]);
    }

    await client.query('COMMIT');
    logger.info(`Salvos ${savedItens.length} itens para o pedido ${pedidoId}`);
    return savedItens;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Erro ao salvar itens do pedido:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

export async function saveEventoPedido(eventId, pedidoId, tipoEvento, ocorridoEm, publicado = true) {
  const text = `
    INSERT INTO evento_pedido (event_id, pedido_id, tipo_evento, ocorrido_em, publicado)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;
  const result = await query(text, [eventId, pedidoId, tipoEvento, ocorridoEm, publicado]);
  return result.rows[0];
}

export async function processarPedidoCompleto(evento) {
  const { eventId, tipoEvento, ocorridoEm, pedidoId, itens } = evento;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const pedidoResult = await client.query(
      `INSERT INTO pedido (id, criado_em, status)
       VALUES ($1, $2, 'RECEBIDO')
       ON CONFLICT (id) DO UPDATE SET status = 'RECEBIDO'
       RETURNING id`,
      [pedidoId, ocorridoEm]
    );

    if (itens && itens.length > 0) {
      for (const item of itens) {
        await client.query(
          `INSERT INTO item_pedido (pedido_id, produto_id, quantidade)
           VALUES ($1, $2, $3)`,
          [pedidoId, item.produtoId, item.quantidade]
        );
      }
    }

    await client.query(
      `INSERT INTO evento_pedido (event_id, pedido_id, tipo_evento, ocorrido_em, publicado)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, pedidoId, tipoEvento, ocorridoEm]
    );

    await client.query('COMMIT');
    logger.info(`Pedido ${pedidoId} processado com sucesso (evento: ${eventId})`);
    return { pedidoId, eventId, itensCount: itens?.length || 0 };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Erro ao processar pedido completo:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

export async function getPedidoById(pedidoId) {
  const pedidoResult = await query('SELECT * FROM pedido WHERE id = $1', [pedidoId]);
  if (pedidoResult.rows.length === 0) return null;

  const itensResult = await query('SELECT * FROM item_pedido WHERE pedido_id = $1', [pedidoId]);
  const eventosResult = await query('SELECT * FROM evento_pedido WHERE pedido_id = $1', [pedidoId]);

  return {
    ...pedidoResult.rows[0],
    itens: itensResult.rows,
    eventos: eventosResult.rows,
  };
}

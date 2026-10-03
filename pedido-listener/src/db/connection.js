import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      logger.error('Erro inesperado no pool de conexões:', err.message);
    });
  }
  return pool;
}

export async function query(text, params) {
  const pool = getPool();
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executada', { text: text.substring(0, 100), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Erro na query:', error.message, { text: text.substring(0, 100) });
    throw error;
  }
}

export async function getClient() {
  const pool = getPool();
  return pool.connect();
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Pool de conexões fechado');
  }
}

export async function initDatabase() {
  const createTables = `
    -- Tabela pedido
    CREATE TABLE IF NOT EXISTS pedido (
      id BIGINT PRIMARY KEY,
      criado_em TIMESTAMP WITH TIME ZONE NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'RECEBIDO'
    );

    -- Tabela item_pedido
    CREATE TABLE IF NOT EXISTS item_pedido (
      id BIGSERIAL PRIMARY KEY,
      pedido_id BIGINT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
      produto_id BIGINT NOT NULL,
      quantidade BIGINT NOT NULL
    );

    -- Tabela evento_pedido
    CREATE TABLE IF NOT EXISTS evento_pedido (
      event_id CHAR(36) PRIMARY KEY,
      pedido_id BIGINT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
      tipo_evento VARCHAR(50) NOT NULL,
      ocorrido_em TIMESTAMP WITH TIME ZONE NOT NULL,
      publicado BOOLEAN NOT NULL DEFAULT FALSE
    );

    -- Índices para performance
    CREATE INDEX IF NOT EXISTS idx_item_pedido_pedido_id ON item_pedido(pedido_id);
    CREATE INDEX IF NOT EXISTS idx_evento_pedido_pedido_id ON evento_pedido(pedido_id);
    CREATE INDEX IF NOT EXISTS idx_evento_pedido_tipo ON evento_pedido(tipo_evento);
  `;

  try {
    await query(createTables);
    logger.info('Tabelas do banco de dados inicializadas com sucesso');
  } catch (error) {
    logger.error('Erro ao inicializar tabelas:', error.message);
    throw error;
  }
}

import { initDatabase, closePool } from './connection.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

async function main() {
  try {
    logger.info('Inicializando banco de dados...');
    logger.info(`Host: ${config.database.host}:${config.database.port}`);
    logger.info(`Database: ${config.database.database}`);

    await initDatabase();
    logger.info('Banco de dados inicializado com sucesso!');
  } catch (error) {
    logger.error('Falha ao inicializar banco de dados:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();

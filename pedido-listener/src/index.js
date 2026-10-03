import { config, validateConfig } from './config/index.js';
import { connectRabbitMQ, setupTopology, closeRabbitMQ } from './rabbitmq/connection.js';
import { initDatabase, closePool } from './db/connection.js';
import { startConsumer } from './consumer/pedidoConsumer.js';
import { logger } from './utils/logger.js';

let isShuttingDown = false;

async function main() {
  try {
    logger.info('=== Iniciando Pedido Listener ===');
    logger.info(`Ambiente: ${config.app.nodeEnv}`);

    validateConfig();
    logger.info('Configurações validadas');

    await initDatabase();

    const { channel } = await connectRabbitMQ();
    await setupTopology(channel);

    await startConsumer();

    logger.info('Listener rodando. Aguardando mensagens...');
    logger.info('Pressione Ctrl+C para encerrar');

    setupGracefulShutdown();
  } catch (error) {
    logger.error('Erro fatal na inicialização:', error.message);
    await shutdown(1);
  }
}

function setupGracefulShutdown() {
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`Sinal ${signal} recebido. Iniciando shutdown graceful...`);
      await shutdown(0);
    });
  });

  process.on('uncaughtException', async (error) => {
    logger.error('Exceção não capturada:', error.message, error.stack);
    await shutdown(1);
  });

  process.on('unhandledRejection', async (reason) => {
    logger.error('Promise rejeitada não tratada:', reason);
    await shutdown(1);
  });
}

async function shutdown(exitCode) {
  if (isShuttingDown) {
    logger.warn('Shutdown já em andamento...');
    return;
  }
  isShuttingDown = true;

  try {
    await closeRabbitMQ();
    await closePool();
    logger.info('Shutdown concluído com sucesso');
  } catch (error) {
    logger.error('Erro durante shutdown:', error.message);
  } finally {
    process.exit(exitCode);
  }
}

main();

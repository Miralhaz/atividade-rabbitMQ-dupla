import { config } from '../config/index.js';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = levels[config.app.logLevel] ?? levels.info;

function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return `${prefix} ${message}${args.length ? ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') : ''}`;
}

export const logger = {
  error: (message, ...args) => {
    if (currentLevel >= levels.error) console.error(formatMessage('error', message, ...args));
  },
  warn: (message, ...args) => {
    if (currentLevel >= levels.warn) console.warn(formatMessage('warn', message, ...args));
  },
  info: (message, ...args) => {
    if (currentLevel >= levels.info) console.log(formatMessage('info', message, ...args));
  },
  debug: (message, ...args) => {
    if (currentLevel >= levels.debug) console.log(formatMessage('debug', message, ...args));
  },
};

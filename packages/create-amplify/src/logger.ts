import yargs from 'yargs';
import { LogLevel, Logger } from './create_logger.js';

export const argv = await yargs(process.argv.slice(2)).options({
  debug: {
    type: 'boolean',
    default: false,
  },
  verbose: {
    type: 'boolean',
    default: false,
  },
}).argv;

const logger = new Logger(LogLevel.INFO, global.console, argv);

export { logger };

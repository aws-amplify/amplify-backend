import yargs from 'yargs';

/**
 * A logger that logs messages to the console.
 */
export class Logger {
  /**
   * Creates a new Logger instance.
   * @param console The console to log to.
   * @param minimumLogLevel The minimum log level to log.
   */
  constructor(
    private readonly console: Console = global.console,
    private readonly minimumLogLevel: LogLevel = LogLevel.INFO
  ) {}

  /**
   * Logs a message to the console.
   */
  async log(message: string, level: LogLevel = LogLevel.INFO) {
    const toLogMessage = level <= this.minimumLogLevel;

    if (!toLogMessage) {
      return;
    }

    const logMessage = `[${
      LogLevel[level]
    }] ${new Date().toISOString()}: ${message}`;
    this.console.log(logMessage);
  }

  /**
   * Logs an error to the console.
   */
  async error(message: string) {
    await this.log(message, LogLevel.ERROR);
  }

  /**
   * Logs a warning to the console.
   */
  async warn(message: string) {
    await this.log(message, LogLevel.WARNING);
  }

  /**
   * Logs an info message to the console.
   */
  async info(message: string) {
    await this.log(message, LogLevel.INFO);
  }

  /**
   * Logs a debug message to the console.
   */
  async debug(message: string) {
    await this.log(message, LogLevel.DEBUG);
  }
}
export enum LogLevel {
  ERROR,
  WARNING,
  INFO,
  DEBUG,
}

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

const minimumLogLevel =
  argv.debug || argv.verbose || process.env.CI === 'true'
    ? LogLevel.DEBUG
    : LogLevel.INFO;

const logger = new Logger(global.console, minimumLogLevel);

export { logger };

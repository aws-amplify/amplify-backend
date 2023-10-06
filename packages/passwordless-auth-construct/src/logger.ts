/**
 * A simple logger interface.
 */
export type LoggerInterface = Pick<Console, 'error' | 'info' | 'debug'>;

/**
 * The logger class to be used in Lambda functions.
 */
export class Logger implements LoggerInterface {
  /**
   * Creates a new Logger instance.
   * @param logLevel - The log level for this Logger instance.
   */
  constructor(
    private logLevel: LogLevel,
    private readonly _logger: LoggerInterface = console
  ) {}

  public error = (...args: Parameters<Console['error']>) => {
    if (this.logLevel >= LogLevel.ERROR) {
      this._logger.error(...args);
    }
  };
  public info = (...args: Parameters<Console['info']>) => {
    if (this.logLevel >= LogLevel.INFO) {
      this._logger.info(...args);
    }
  };
  public debug = (...args: Parameters<Console['debug']>) => {
    if (this.logLevel >= LogLevel.DEBUG) {
      this._logger.debug(...args);
    }
  };
}

/**
 * The log level.
 */
export enum LogLevel {
  NONE = 0,
  ERROR = 10,
  INFO = 20,
  DEBUG = 30,
}

/**
 * Parses a string into a log level.
 * @param level - The log level as as string.
 * @returns the log level.
 */
const parseLogLevel = (level?: string): LogLevel => {
  switch (level) {
    case 'ERROR':
      return LogLevel.ERROR;
    case 'INFO':
      return LogLevel.INFO;
    case 'DEBUG':
      return LogLevel.DEBUG;
    default:
      return LogLevel.NONE;
  }
};

/**
 * The logger singleton to be used in Lambda functions.
 */
export const logger = new Logger(parseLogLevel(process.env.LOG_LEVEL));

/**
 * The logger class to be used in Lambda functions.
 */
export class Logger {
  /**
   * Creates a new Logger instance.
   * @param logLevel The log level for this Logger instance.
   */
  constructor(private logLevel: LogLevel) {}

  public error = (...args: unknown[]) => {
    if (this.logLevel >= LogLevel.ERROR) {
      // eslint-disable-next-line no-console
      console.error(...args);
    }
  };
  public info = (...args: unknown[]) => {
    if (this.logLevel >= LogLevel.INFO) {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  };
  public debug = (...args: unknown[]) => {
    if (this.logLevel >= LogLevel.DEBUG) {
      // eslint-disable-next-line no-console
      console.trace(...args);
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
 * @param level The log level as as string.
 * @returns The LogLevel
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

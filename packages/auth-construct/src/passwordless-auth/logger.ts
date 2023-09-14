// TODO: Update to "NONE"
const defaultLogLevel = 'DEBUG';

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
 * The logger class to be used in Lambda functions.
 */
class Logger {
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
      console.log(...args);
    }
  };
  public debug = (...args: unknown[]) => {
    if (this.logLevel >= LogLevel.DEBUG) {
      // eslint-disable-next-line no-console
      console.trace(...args);
    }
  };
}

const logLevel =
  {
    ERROR: LogLevel.ERROR,
    INFO: LogLevel.INFO,
    DEBUG: LogLevel.DEBUG,
  }[process.env.LOG_LEVEL ?? defaultLogLevel] ?? LogLevel.NONE;

/**
 * The logger singleton to be used in Lambda functions.
 */
export const logger = new Logger(logLevel);

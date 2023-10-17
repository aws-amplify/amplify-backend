import yargs from 'yargs';

/**
 * A logger that logs messages to the console.
 */
class Logger {
  /**
   * Creates a new Logger instance.
   * @param level The minimum log level to log.
   * @param console The console to log to.
   */
  constructor(
    private readonly level: LogLevel = LogLevel.INFO,
    private readonly console: Console = global.console
  ) {
    this.level = level;
  }

  /**
   * Logs a message to the console.
   */
  async log(message: string, level: LogLevel = LogLevel.INFO) {
    const argv = await yargs(process.argv.slice(2)).options({
      debug: {
        type: 'boolean',
        default: false,
      },
      verbose: {
        type: 'boolean',
        default: false,
      },
    }).argv;

    const toLogMessage = level <= this.level || argv.debug || argv.verbose;

    if (!toLogMessage) {
      return;
    }

    const logMessage = `[${
      LogLevel[level]
    }] ${new Date().toISOString()}: ${message}`;
    this.console.log(logMessage);
  }
}

enum LogLevel {
  ERROR,
  WARNING,
  INFO,
  DEBUG,
}

export { Logger, LogLevel };

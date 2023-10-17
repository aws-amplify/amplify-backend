import yargs from 'yargs';

/**
 *
 */
class Logger {
  private level: LogLevel;

  /**
   * Creates a new logger.
   */
  constructor(level: LogLevel | undefined = LogLevel.INFO) {
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

    const toLogMessage = level >= this.level || argv.debug || argv.verbose;

    if (!toLogMessage) {
      return;
    }

    const logMessage = `[${
      LogLevel[level]
    }] ${new Date().toISOString()}: ${message}`;
    console.log(logMessage);
  }
}

enum LogLevel {
  ERROR,
  WARNING,
  INFO,
  DEBUG,
}

export { Logger, LogLevel };

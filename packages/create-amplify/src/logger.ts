import yargs from 'yargs';
import * as os from 'os';

/**
 * A logger that logs messages to the console.
 */
export class Logger {
  // Properties for ellipsis animation
  private timer: ReturnType<typeof setTimeout>;
  private refreshRate: number;

  /**
   * Creates a new Logger instance. Injecting stdout for testing.
   * @param stdout The stream to write logs to.
   * @param minimumLogLevel The minimum log level to log.
   */
  constructor(
    private readonly stdout = process.stdout,
    private readonly minimumLogLevel: LogLevel = LogLevel.INFO
  ) {
    this.refreshRate = 500; // every 0.5 seconds
  }

  /**
   * Logs a message to the console.
   */
  log(message: string, level: LogLevel = LogLevel.INFO) {
    const toLogMessage = level <= this.minimumLogLevel;

    if (!toLogMessage) {
      return;
    }

    const logMessage =
      this.minimumLogLevel === LogLevel.DEBUG
        ? `[${LogLevel[level]}] ${new Date().toISOString()}: ${message}`
        : message;
    this.stdout.write(logMessage + os.EOL);
  }

  /**
   * Logs a message with animated ellipsis
   */
  async withEllipsis(message: string, callback: () => Promise<void>) {
    this.startAnimatingEllipsis(message);
    await callback();
    this.stopAnimatingEllipsis(message);
  }

  /**
   * Start animating ellipsis at the end of a log message.
   */
  private startAnimatingEllipsis(message: string) {
    if (!this.isTTY()) {
      this.log(message, LogLevel.INFO);
      return;
    }

    const frameLength = 4; // number of desired dots - 1
    let frameCount = 0;
    this.writeEscapeSequence(EscapeSequence.HIDE_CURSOR);
    this.stdout.write(message);
    this.timer = setInterval(() => {
      this.writeEscapeSequence(EscapeSequence.CLEAR_LINE);
      this.writeEscapeSequence(EscapeSequence.MOVE_CURSOR_TO_START);
      this.stdout.write(message + '.'.repeat(++frameCount % frameLength));
    }, this.refreshRate);
  }

  /**
   * Stops animating ellipsis and replace with a log message.
   */
  private stopAnimatingEllipsis(message: string) {
    if (!this.isTTY()) {
      return;
    }

    clearInterval(this.timer);
    this.writeEscapeSequence(EscapeSequence.CLEAR_LINE);
    this.writeEscapeSequence(EscapeSequence.MOVE_CURSOR_TO_START);
    this.writeEscapeSequence(EscapeSequence.SHOW_CURSOR);
    this.stdout.write(`${message}...${os.EOL}`);
  }

  /**
   * Writes escape sequence to stdout
   */
  writeEscapeSequence(action: EscapeSequence) {
    if (!this.isTTY()) {
      return;
    }

    this.stdout.write(action);
  }

  /**
   * Checks if the environment is TTY
   */
  isTTY() {
    return this.stdout.isTTY;
  }

  /**
   * Logs an error to the console.
   */
  error(message: string) {
    this.log(message, LogLevel.ERROR);
  }

  /**
   * Logs a warning to the console.
   */
  warn(message: string) {
    this.log(message, LogLevel.WARNING);
  }

  /**
   * Logs an info message to the console.
   */
  info(message: string) {
    this.log(message, LogLevel.INFO);
  }

  /**
   * Logs a debug message to the console.
   */
  debug(message: string) {
    this.log(message, LogLevel.DEBUG);
  }
}

enum EscapeSequence {
  CLEAR_LINE = '\x1b[2K',
  MOVE_CURSOR_TO_START = '\x1b[0G',
  SHOW_CURSOR = '\x1b[?25h',
  HIDE_CURSOR = '\x1b[?25l',
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
}).argv;

const minimumLogLevel = argv.debug ? LogLevel.DEBUG : LogLevel.INFO;

const logger = new Logger(process.stdout, minimumLogLevel);

export { logger };

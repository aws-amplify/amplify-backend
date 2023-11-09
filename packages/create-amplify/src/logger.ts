import yargs from 'yargs';
import * as os from 'os';

/**
 * A logger that logs messages to the console.
 */
export class Logger {
  /**
   * Properties for ellipsis animation
   */
  private timer: ReturnType<typeof setTimeout>;
  private refreshRate: number;
  private animateMessage: string;

  /**
   * Creates a new Logger instance. Injecting stdout for testing.
   * @param console The console to log to.
   * @param minimumLogLevel The minimum log level to log.
   */
  constructor(
    private readonly console: Console = global.console,
    private readonly minimumLogLevel: LogLevel = LogLevel.INFO,
    private readonly stdout = process.stdout
  ) {
    this.refreshRate = 500; // every 0.5 seconds
  }

  /**
   * Logs a message to the console.
   */
  async log(message: string, level: LogLevel = LogLevel.INFO) {
    const toLogMessage = level <= this.minimumLogLevel;

    if (!toLogMessage) {
      return;
    }

    const logMessage =
      level === LogLevel.DEBUG
        ? `[${LogLevel[level]}] ${new Date().toISOString()}: ${message}`
        : message;
    this.console.log(logMessage);
  }

  /**
   * Start animating ellipsis at the end of a log message.
   */
  async startAnimatingEllipsis(message: string) {
    if (!this.isTTY()) {
      await this.log(message, LogLevel.INFO);
      return;
    }

    this.animateMessage = message;
    const frames = ['.', '..', '...'];
    let frameCount = 0;
    this.writeEscapeSequence(EscapeSequence.HIDE_CURSOR);
    this.stdout.write(this.animateMessage);
    this.timer = setInterval(() => {
      this.writeEscapeSequence(EscapeSequence.CLEAR_LINE);
      this.writeEscapeSequence(EscapeSequence.MOVE_CURSOR_TO_START);
      this.stdout.write(this.animateMessage + frames[frameCount++]);
      frameCount = frameCount % frames.length;
    }, this.refreshRate);
  }

  /**
   * Stops animating ellipsis and replace with a log message.
   */
  async stopAnimatingEllipsis() {
    if (!this.isTTY()) {
      return;
    }

    clearInterval(this.timer);
    this.writeEscapeSequence(EscapeSequence.CLEAR_LINE);
    this.writeEscapeSequence(EscapeSequence.MOVE_CURSOR_TO_START);
    this.stdout.write(`${this.animateMessage}...${os.EOL}`);
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

export enum EscapeSequence {
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
  verbose: {
    type: 'boolean',
    default: false,
  },
}).argv;

const minimumLogLevel =
  argv.debug || argv.verbose ? LogLevel.DEBUG : LogLevel.INFO;

const logger = new Logger(global.console, minimumLogLevel);

export { logger };

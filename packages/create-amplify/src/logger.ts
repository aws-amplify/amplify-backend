import yargs from 'yargs';
import kleur from 'kleur';
import * as os from 'os';

/**
 * A logger that logs messages to the console.
 */
export class Logger {
  // Properties for ellipsis animation
  private timer: ReturnType<typeof setTimeout>;
  private refreshRate: number;
  private timerSet: boolean;

  /**
   * Spinner frames
   */
  private spinnerFrames = [
    kleur.red('⠋'),
    kleur.yellow('⠙'),
    kleur.green('⠹'),
    kleur.cyan('⠸'),
    kleur.blue('⠼'),
    kleur.magenta('⠴'),
    kleur.red('⠦'),
    kleur.yellow('⠧'),
    kleur.green('⠇'),
    kleur.cyan('⠏'),
  ];
  private currentSpinnerMessage = '';

  /**
   * Creates a new Logger instance. Injecting stdout for testing.
   * @param minimumLogLevel The minimum log level to log.
   * @param stdout The stream to write logs to. Injected for testing.
   */
  constructor(
    private readonly minimumLogLevel: LogLevel = LogLevel.INFO,
    private readonly stdout = process.stdout
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
  async indicateProgress(message: string, callback: () => Promise<void>) {
    try {
      this.startAnimatingEllipsis(message);
      await callback();
    } finally {
      this.stopAnimatingEllipsis(message);
    }
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

  /**
   * Logs a message with animated spinner
   */
  async indicateSpinnerProgress(
    actions: (() => Promise<void>)[],
    messages: string[],
    successMessage: string
  ) {
    try {
      for (let i = 0; i < actions.length; i++) {
        if (i === 0) {
          this.startAnimatingSpinner(messages[i]);
        } else {
          this.updateSpinnerMessage(messages[i]);
        }
        await actions[i]();
      }
      this.stopAnimatingSpinner(successMessage);
    } catch (error) {
      this.stopAnimatingSpinner('An error occurred');
      throw error;
    }
  }

  /**
   * Start animating ellipsis at the end of a log message.
   */
  private startAnimatingEllipsis(message: string) {
    if (!this.isTTY()) {
      this.log(message, LogLevel.INFO);
      return;
    }

    if (this.timerSet) {
      throw new Error(
        'Timer is already set to animate ellipsis, stop the current running timer before starting a new one.'
      );
    }

    const frameLength = 4; // number of desired dots - 1
    let frameCount = 0;
    this.timerSet = true;
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
    this.timerSet = false;
    this.writeEscapeSequence(EscapeSequence.CLEAR_LINE);
    this.writeEscapeSequence(EscapeSequence.MOVE_CURSOR_TO_START);
    this.writeEscapeSequence(EscapeSequence.SHOW_CURSOR);
    this.stdout.write(`${message}...${os.EOL}`);
  }

  /**
   * Start animating spinner at the end of a log message.
   */
  private startAnimatingSpinner(message: string) {
    this.currentSpinnerMessage = message;
    if (!this.isTTY()) {
      this.log(message, LogLevel.INFO);
      return;
    }

    if (this.timerSet) {
      throw new Error(
        'Timer is already set to animate spinner, stop the current running timer before starting a new one.'
      );
    }

    let frameIndex = 0;
    this.timerSet = true;
    this.writeEscapeSequence(EscapeSequence.HIDE_CURSOR);
    this.stdout.write(message);
    this.timer = setInterval(() => {
      this.writeEscapeSequence(EscapeSequence.CLEAR_LINE);
      this.writeEscapeSequence(EscapeSequence.MOVE_CURSOR_TO_START);
      const frame = this.spinnerFrames[frameIndex];
      this.stdout.write(`${this.currentSpinnerMessage} ${frame}`);
      frameIndex = (frameIndex + 1) % this.spinnerFrames.length;
    }, this.refreshRate);
  }

  /**
   * Updates the message on the animated spinner
   */
  private updateSpinnerMessage(message: string) {
    if (!this.timerSet) {
      this.startAnimatingSpinner(message);
    } else {
      this.currentSpinnerMessage = message;
    }
  }

  /**
   * Stops animating spinner and replace with a log message.
   */
  private stopAnimatingSpinner(message: string) {
    if (!this.isTTY()) {
      return;
    }

    clearInterval(this.timer);
    this.timerSet = false;
    this.writeEscapeSequence(EscapeSequence.CLEAR_LINE);
    this.writeEscapeSequence(EscapeSequence.MOVE_CURSOR_TO_START);
    this.writeEscapeSequence(EscapeSequence.SHOW_CURSOR);
    this.stdout.write(`${message} ✔${os.EOL}`);
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

const logger = new Logger(minimumLogLevel, process.stdout);

export { logger };

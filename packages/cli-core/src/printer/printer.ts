import { COLOR, color } from '../colors.js';
import { EOL } from 'os';

export type RecordValue = string | number | string[] | Date;

/**
 * The class that pretty prints to the output stream.
 */
export class Printer {
  // Properties for ellipsis animation
  private timer: ReturnType<typeof setTimeout>;
  private timerSet: boolean;
  /**
   * Spinner frames
   */
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentSpinnerMessage = '';

  /**
   * Sets default configs
   */
  constructor(
    private readonly minimumLogLevel: LogLevel,
    private readonly stdout: NodeJS.WriteStream = process.stdout,
    private readonly stderr: NodeJS.WriteStream = process.stderr,
    private readonly refreshRate: number = 500
  ) {}

  /**
   * Prints an array of objects/records to output stream.
   */
  printRecords = <T extends Record<string | number, RecordValue>>(
    ...objects: T[]
  ): void => {
    for (const obj of objects) {
      this.printRecord(obj);
    }
  };

  /**
   * Prints a given message (with optional color) to output stream.
   */
  print = (message: string, colorName?: COLOR) => {
    if (colorName) {
      this.stdout.write(color(colorName, message));
    } else {
      this.stdout.write(message);
    }
  };

  /**
   * Prints a new line to output stream
   */
  printNewLine = () => {
    this.stdout.write(EOL);
  };

  /**
   * Logs a message to the output stream.
   */
  log(message: string, level: LogLevel = LogLevel.INFO, eol = true) {
    const doLogMessage = level <= this.minimumLogLevel;

    if (!doLogMessage) {
      return;
    }

    const logMessage =
      this.minimumLogLevel === LogLevel.DEBUG
        ? `[${LogLevel[level]}] ${new Date().toISOString()}: ${message}`
        : message;

    if (level === LogLevel.ERROR) {
      this.stderr.write(logMessage);
    } else {
      this.stdout.write(logMessage);
    }

    if (eol) {
      this.printNewLine();
    }
  }

  /**
   * Logs a message with animated spinner
   */
  async indicateProgress(
    action: () => Promise<void>,
    message: string,
    successMessage: string
  ) {
    try {
      this.startAnimatingSpinner(message);
      await action();
      this.stopAnimatingSpinner(successMessage);
    } catch (error) {
      this.stopAnimatingSpinner('An error occurred');
      throw error;
    }
  }

  /**
   * Print an object/record to output stream.
   */
  private printRecord = <T extends Record<string | number, RecordValue>>(
    object: T
  ): void => {
    let message = '';
    const entries = Object.entries(object);
    entries.forEach(([key, val]) => {
      message = message.concat(` ${key}: ${val as string}${EOL}`);
    });
    this.stdout.write(message);
  };

  /**
   * Writes escape sequence to stdout
   */
  private writeEscapeSequence(action: EscapeSequence) {
    if (!this.isTTY()) {
      return;
    }

    this.stdout.write(action);
  }

  /**
   * Checks if the environment is TTY
   */
  private isTTY() {
    return this.stdout.isTTY;
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
    this.timer = setInterval(() => {
      this.writeEscapeSequence(EscapeSequence.CLEAR_LINE);
      this.writeEscapeSequence(EscapeSequence.MOVE_CURSOR_TO_START);
      const frame = this.spinnerFrames[frameIndex];
      this.stdout.write(`${frame} ${this.currentSpinnerMessage}`);
      frameIndex = (frameIndex + 1) % this.spinnerFrames.length;
    }, this.refreshRate);
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
    this.stdout.write(`✔ ${message}`);
    this.printNewLine();
  }
}

export enum LogLevel {
  ERROR = 0,
  INFO = 1,
  DEBUG = 2,
}

enum EscapeSequence {
  CLEAR_LINE = '\x1b[2K',
  MOVE_CURSOR_TO_START = '\x1b[0G',
  SHOW_CURSOR = '\x1b[?25h',
  HIDE_CURSOR = '\x1b[?25l',
}

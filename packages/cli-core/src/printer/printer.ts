import { COLOR, color } from '../colors.js';
import { EOL } from 'os';

export type RecordValue = string | number | string[] | Date;

/**
 * The class that pretty prints to the console.
 */
export class Printer {
  // Properties for ellipsis animation
  private timer: ReturnType<typeof setTimeout>;
  private refreshRate: number;
  private timerSet: boolean;

  /**
   * Sets default configs
   */
  constructor(
    private readonly minimumLogLevel: LogLevel,
    private readonly stdout: NodeJS.WriteStream = process.stdout,
    private readonly stderr: NodeJS.WriteStream = process.stderr
  ) {
    this.refreshRate = 500;
  }

  /**
   * Print an object/record to console.
   */
  printRecord = <T extends Record<string | number, RecordValue>>(
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
   * Prints an array of objects/records to console.
   */
  printRecords = <T extends Record<string | number, RecordValue>>(
    objects: T[]
  ): void => {
    for (const obj of objects) {
      this.printRecord(obj);
    }
  };

  /**
   * Prints a given message (with optional color) to console.
   */
  print = (message: string, colorName?: COLOR) => {
    if (colorName) {
      this.stdout.write(color(colorName, message));
    } else {
      this.stdout.write(message);
    }
  };

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
   * Prints a new line to console
   */
  printNewLine = () => {
    this.stdout.write(EOL);
  };

  /**
   * Logs a message to the console.
   */
  log(message: string, level: LogLevel = LogLevel.INFO, eol = true) {
    const toLogMessage = level <= this.minimumLogLevel;

    if (!toLogMessage) {
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
    this.stdout.write(`${message}...${EOL}`);
  }

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
}

export enum LogLevel {
  ERROR,
  INFO,
  DEBUG,
}

enum EscapeSequence {
  CLEAR_LINE = '\x1b[2K',
  MOVE_CURSOR_TO_START = '\x1b[0G',
  SHOW_CURSOR = '\x1b[?25h',
  HIDE_CURSOR = '\x1b[?25l',
}

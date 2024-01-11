import yargs from 'yargs';
import { COLOR, color } from '../colors.js';
import { EOL } from 'os';

export type RecordValue = string | number | string[] | Date;

/**
 * The class that pretty prints to the console.
 */
export class Printer {
  private static instance: Printer;

  // Properties for ellipsis animation
  private timer: ReturnType<typeof setTimeout>;
  private refreshRate: number;
  private timerSet: boolean;

  /**
   * returns static instance
   */
  constructor(
    private readonly minimumLogLevel: LogLevel,
    private readonly stdout = process.stdout
  ) {
    if (Printer.instance) {
      return Printer.instance;
    }

    // set default properties.
    Printer.instance = this;
    Printer.instance.refreshRate = 500;
  }

  /**
   * Print an object/record to console.
   */
  static printRecord = <T extends Record<string | number, RecordValue>>(
    object: T
  ): void => {
    let message = '';
    const entries = Object.entries(object);
    entries.forEach(([key, val]) => {
      message = message.concat(` ${key}: ${val as string}${EOL}`);
    });
    Printer.instance.stdout.write(message);
  };

  /**
   * Prints an array of objects/records to console.
   */
  static printRecords = <T extends Record<string | number, RecordValue>>(
    objects: T[]
  ): void => {
    for (const obj of objects) {
      this.printRecord(obj);
    }
  };

  /**
   * Prints a given message (with optional color) to console.
   */
  static print = (message: string, colorName?: COLOR) => {
    if (colorName) {
      Printer.instance.stdout.write(color(colorName, message));
    } else {
      Printer.instance.stdout.write(message);
    }
  };

  /**
   * Logs a message with animated ellipsis
   */
  static async indicateProgress(
    message: string,
    callback: () => Promise<void>
  ) {
    try {
      Printer.instance.startAnimatingEllipsis(message);
      await callback();
    } finally {
      Printer.instance.stopAnimatingEllipsis(message);
    }
  }

  /**
   * Prints a new line to console
   */
  static printNewLine = () => {
    Printer.instance.stdout.write(EOL);
  };

  /**
   * Writes escape sequence to stdout
   */
  static writeEscapeSequence(action: EscapeSequence) {
    if (!Printer.instance.isTTY()) {
      return;
    }

    Printer.instance.stdout.write(action);
  }

  /**
   * Logs a message to the console.
   */
  static log(message: string, level: LogLevel = LogLevel.INFO, eol = true) {
    // console.log(Printer.instance);
    const toLogMessage = level <= Printer.instance.minimumLogLevel;

    if (!toLogMessage) {
      return;
    }

    const logMessage =
      Printer.instance.minimumLogLevel === LogLevel.DEBUG
        ? `[${LogLevel[level]}] ${new Date().toISOString()}: ${message}`
        : message;
    Printer.instance.stdout.write(logMessage);

    if (eol) {
      Printer.printNewLine();
    }
  }

  /**
   * Logs an error to the console.
   */
  static error(message: string) {
    this.log(message, LogLevel.ERROR);
  }

  /**
   * Logs a warning to the console.
   */
  static warn(message: string) {
    this.log(message, LogLevel.WARNING);
  }

  /**
   * Logs an info message to the console.
   */
  static info(message: string) {
    this.log(message, LogLevel.INFO);
  }

  /**
   * Logs a debug message to the console.
   */
  static debug(message: string) {
    this.log(message, LogLevel.DEBUG);
  }

  /**
   * Start animating ellipsis at the end of a log message.
   */
  private startAnimatingEllipsis(message: string) {
    if (!this.isTTY()) {
      Printer.log(message, LogLevel.INFO);
      return;
    }

    if (Printer.instance.timerSet) {
      throw new Error(
        'Timer is already set to animate ellipsis, stop the current running timer before starting a new one.'
      );
    }

    const frameLength = 4; // number of desired dots - 1
    let frameCount = 0;
    Printer.instance.timerSet = true;
    Printer.writeEscapeSequence(EscapeSequence.HIDE_CURSOR);
    Printer.instance.stdout.write(message);
    Printer.instance.timer = setInterval(() => {
      Printer.writeEscapeSequence(EscapeSequence.CLEAR_LINE);
      Printer.writeEscapeSequence(EscapeSequence.MOVE_CURSOR_TO_START);
      Printer.instance.stdout.write(
        message + '.'.repeat(++frameCount % frameLength)
      );
    }, Printer.instance.refreshRate);
  }

  /**
   * Stops animating ellipsis and replace with a log message.
   */
  private stopAnimatingEllipsis(message: string) {
    if (!this.isTTY()) {
      return;
    }

    clearInterval(Printer.instance.timer);
    Printer.instance.timerSet = false;
    Printer.writeEscapeSequence(EscapeSequence.CLEAR_LINE);
    Printer.writeEscapeSequence(EscapeSequence.MOVE_CURSOR_TO_START);
    Printer.writeEscapeSequence(EscapeSequence.SHOW_CURSOR);
    Printer.instance.stdout.write(`${message}...${EOL}`);
  }

  /**
   * Checks if the environment is TTY
   */
  private isTTY() {
    return Printer.instance.stdout.isTTY;
  }
}

export enum LogLevel {
  ERROR,
  WARNING,
  INFO,
  DEBUG,
}

export enum EscapeSequence {
  CLEAR_LINE = '\x1b[2K',
  MOVE_CURSOR_TO_START = '\x1b[0G',
  SHOW_CURSOR = '\x1b[?25h',
  HIDE_CURSOR = '\x1b[?25l',
}

const argv = await yargs(process.argv.slice(2)).options({
  debug: {
    type: 'boolean',
    default: false,
  },
}).argv;

const minimumLogLevel = argv.debug ? LogLevel.DEBUG : LogLevel.INFO;

const instance = new Printer(minimumLogLevel);

export default instance;

import { WriteStream } from 'node:tty';
import { EOL } from 'os';
import ora, { Ora, oraPromise } from 'ora';
import { ColorName, format } from '../format/format.js';

export type RecordValue = string | number | string[] | Date;

/**
 * The class that pretty prints to the output stream.
 */
export class Printer {
  private currentSpinners: {
    [id: string]: { instance: Ora; timeout: NodeJS.Timeout };
  } = {};
  /**
   * Sets default configs
   */
  constructor(
    private readonly minimumLogLevel: LogLevel,
    private readonly stdout:
      | WriteStream
      | NodeJS.WritableStream = process.stdout,
    private readonly stderr:
      | WriteStream
      | NodeJS.WritableStream = process.stderr,
    private readonly refreshRate: number = 500,
    private readonly enableTTY = process.env.CI ? false : true
  ) {}

  /**
   * Prints a given message to output stream followed by a newline.
   */
  print = (message: string) => {
    message = this.stringify(message);
    this.stdout.write(message);
    this.printNewLine();
  };

  /**
   * Prints a new line to output stream
   */
  printNewLine = () => {
    this.stdout.write(EOL);
  };

  /**
   * Logs a message to the output stream at the given log level followed by a newline
   */
  log = (message: string, level: LogLevel = LogLevel.INFO) => {
    message = this.stringify(message);
    const doLogMessage = level <= this.minimumLogLevel;

    if (!doLogMessage) {
      return;
    }

    let logPrefixFormatFn = format.dim;
    if (level <= LogLevel.WARN) {
      logPrefixFormatFn = (prefix: string) => {
        const prefixColor: ColorName =
          level === LogLevel.ERROR ? 'Red' : 'Yellow';
        return format.bold(
          format.color(`${prefix} [${LogLevel[level]}]`, prefixColor)
        );
      };
    }

    message.split(EOL).forEach((line) => {
      const logMessage = `${logPrefixFormatFn(
        new Date().toLocaleTimeString()
      )} ${line}`;
      if (level === LogLevel.ERROR) {
        this.stdout.write(logMessage);
      } else {
        this.stdout.write(logMessage);
      }
      this.printNewLine();
    });
  };

  /**
   * Logs a message with animated spinner
   * If stdout is not a TTY, the message is logged at the info level without a spinner
   */
  indicateProgress = async (
    message: string,
    callback: () => Promise<void>,
    successMessage?: string
  ) => {
    const timePrefix = format.dim(new Date().toLocaleTimeString());
    await oraPromise(callback, {
      text: message,
      color: 'white',
      stream: this.stdout,
      discardStdin: false,
      hideCursor: false,
      interval: this.refreshRate,
      spinner: 'dots',
      successText: `${timePrefix} ${successMessage ?? message}`,
      isEnabled: this.enableTTY,
    });
  };

  /**
   * Start a spinner for the given message.
   * If stdout is not a TTY, the message is logged at the info level without a spinner
   * @returns the id of the spinner
   */
  startSpinner = (
    id: string,
    message: string,
    options: { timeoutSeconds: number } = { timeoutSeconds: 60 }
  ): string => {
    this.currentSpinners[id] = {
      instance: ora({
        text: message,
        color: 'white',
        stream: this.stdout,
        spinner: 'dots',
        interval: this.refreshRate,
        discardStdin: false,
        hideCursor: false,
        isEnabled: this.enableTTY,
      }).start(),
      timeout: setTimeout(() => {
        this.stopSpinner(id);
      }, options.timeoutSeconds * 1000),
    };
    return id;
  };

  isSpinnerRunning = (id: string): boolean => {
    return this.currentSpinners[id] !== undefined;
  };

  /**
   * Stop a spinner for the given id.
   */
  stopSpinner = (id: string): void => {
    if (this.currentSpinners[id] === undefined) return;
    this.currentSpinners[id].instance.stop();
    clearTimeout(this.currentSpinners[id].timeout);
    delete this.currentSpinners[id];
  };

  /**
   * Update the spinner options for a given id, e.g. message or prefixText
   */
  updateSpinner = (
    id: string,
    options: { message?: string; prefixText?: string }
  ): void => {
    if (this.currentSpinners[id] === undefined) {
      this.log(
        `Spinner with id ${id} not found or already stopped`,
        LogLevel.ERROR
      );
      return;
    }
    if (options.prefixText) {
      this.currentSpinners[id].instance.prefixText = options.prefixText;
    } else if (options.message) {
      this.currentSpinners[id].instance.text = options.message;
    }
    // Refresh the timer
    this.currentSpinners[id].timeout.refresh();
  };

  /**
   * Clears the console
   */
  clearConsole = () => {
    this.stdout.write('\n'.repeat(process.stdout.rows));
  };

  stringify = (msg: unknown): string => {
    if (typeof msg === 'string') {
      return msg;
    } else if (msg instanceof Error) {
      return msg.message;
    }
    try {
      return JSON.stringify(msg, null, 2);
    } catch {
      return String(msg);
    }
  };
}

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

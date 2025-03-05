import { WriteStream } from 'node:tty';
import { EOL } from 'os';
import ora, { Ora } from 'ora';
import { ColorName, format } from '../format/format.js';

export type RecordValue = string | number | string[] | Date;

/**
 * The class that pretty prints to the output stream.
 */
export class Printer {
  private currentSpinner: { instance?: Ora; timeout?: NodeJS.Timeout } = {};
  /**
   * Sets default configs
   */
  constructor(
    private readonly minimumLogLevel: LogLevel,
    readonly stdout: WriteStream | NodeJS.WritableStream = process.stdout,
    readonly stderr: WriteStream | NodeJS.WritableStream = process.stderr,
    private readonly refreshRate: number = 100,
    private readonly enableTTY = process.env.CI ? false : true
  ) {}

  /**
   * Prints a given message to output stream followed by a newline.
   * If a spinner is running, honor it and keep the spinner at the cursor running
   */
  print = (message: string) => {
    message = this.stringify(message);
    if (this.isSpinnerRunning()) {
      this.printNewLine();
    }
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

    this.print(this.prefixedMessage(message, level));
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
    try {
      this.startSpinner(message, { timeoutSeconds: 3600 });
      await callback();
    } finally {
      this.stopSpinner(successMessage);
    }
  };

  /**
   * Start a spinner for the given message.
   * If stdout is not a TTY, the message is logged at the info level without a spinner
   */
  startSpinner = (
    message: string,
    options: { timeoutSeconds: number } = { timeoutSeconds: 60 }
  ): void => {
    if (!this.enableTTY) {
      // Ora prints messages with a preceding `-` in non-tty console. We avoid it
      this.log(message);
      return;
    }
    // Can only run one spinner at a time.
    if (this.isSpinnerRunning()) {
      this.stopSpinner();
    }
    this.currentSpinner = {
      instance: ora({
        text: this.prefixedMessage(message),
        color: 'white',
        stream: this.stdout,
        spinner: 'dots',
        interval: this.refreshRate,
        discardStdin: false,
        hideCursor: false,
        isEnabled: this.enableTTY,
      }).start(),
      timeout: setTimeout(() => {
        this.stopSpinner();
      }, options.timeoutSeconds * 1000),
    };
  };

  isSpinnerRunning = (): boolean => {
    return this.currentSpinner.instance !== undefined;
  };

  /**
   * Stop the current running spinner
   */
  stopSpinner = (successMessage?: string): void => {
    if (this.currentSpinner.instance === undefined) {
      if (!this.enableTTY && successMessage) {
        this.print(`${format.success('✔')} ${successMessage}`);
      }
      return;
    }
    if (successMessage) {
      this.currentSpinner.instance.succeed(
        this.prefixedMessage(successMessage)
      );
    } else {
      this.currentSpinner.instance.stop();
    }
    clearTimeout(this.currentSpinner.timeout);
    this.currentSpinner = {};
  };

  /**
   * Update the current running spinner options, e.g. message or prefixText
   */
  updateSpinner = (options: {
    message?: string;
    prefixText?: string;
  }): void => {
    if (!this.enableTTY) {
      // prefix texts are not displayed in non-tty console by Ora and regular messages have a preceding `-`
      options.prefixText && this.log(options.prefixText);
      options.message && this.log(options.message);
      return;
    }

    if (this.currentSpinner.instance === undefined) {
      this.log(`No running spinner found.`, LogLevel.WARN);
      // // Maybe timed out? If the message was available, we start a new one
      if (options.message) {
        this.startSpinner(options.message);
        this.updateSpinner({ prefixText: options.prefixText });
      }
      return;
    }
    if (options.prefixText) {
      this.currentSpinner.instance.prefixText = options.prefixText;
    } else if (options.message) {
      this.currentSpinner.instance.text = options.message;
    }
    // Refresh the timer
    this.currentSpinner.timeout?.refresh();
  };

  /**
   * Clears the console
   */
  clearConsole = () => {
    if (this.enableTTY) {
      this.stdout.write('\n'.repeat(process.stdout.rows));
    }
  };

  private stringify = (msg: unknown): string => {
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

  private getLogPrefix = (level = LogLevel.INFO) => {
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
    return logPrefixFormatFn(new Date().toLocaleTimeString());
  };

  private prefixedMessage = (message: string, level = LogLevel.INFO) => {
    return (
      message &&
      message
        .split(EOL)
        .map((line) => `${this.getLogPrefix(level)} ${line}`)
        .join(EOL)
    );
  };
}

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

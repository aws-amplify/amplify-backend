import { WriteStream } from 'node:tty';
import { EOL } from 'os';
import ora, { Ora, oraPromise } from 'ora';

export type RecordValue = string | number | string[] | Date;

/**
 * The class that pretty prints to the output stream.
 */
export class Printer {
  private currentSpinners: { [message: string]: Ora } = {};
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
    private readonly refreshRate: number = 500
  ) {}

  /**
   * Prints a given message to output stream followed by a newline.
   */
  print = (message: string) => {
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
  log(message: string, level: LogLevel = LogLevel.INFO) {
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

    this.printNewLine();
  }

  /**
   * Logs a message with animated spinner
   * If stdout is not a TTY, the message is logged at the info level without a spinner
   */
  async indicateProgress(
    message: string,
    callback: () => Promise<void>,
    successMessage?: string
  ) {
    // eslint-disable-next-line no-console
    console.dir(this.stdout);
    // eslint-disable-next-line no-console
    console.log('isTTY' in this.stdout ? this.stdout.isTTY : 'no tty');
    await oraPromise(callback, {
      text: message,
      stream: this.stdout,
      discardStdin: false,
      hideCursor: false,
      interval: this.refreshRate,
      spinner: 'dots',
      successText: successMessage,
    });
  }

  /**
   * Start a spinner for the given message.
   * If stdout is not a TTY, the message is logged at the info level without a spinner
   */
  startSpinner(message: string) {
    this.currentSpinners[message] = ora({
      text: message,
      stream: this.stdout,
      spinner: 'dots',
      interval: this.refreshRate,
      discardStdin: false,
      hideCursor: false,
    }).start();
  }

  /**
   * Stop a spinner for the given message.
   */
  stopSpinner(message: string) {
    this.currentSpinners[message].stop();
    delete this.currentSpinners[message];
  }

  /**
   * Update the spinner options, e.g. prefixText
   */
  updateSpinner(message: string, options: { prefixText: string }) {
    this.currentSpinners[message].prefixText = options.prefixText;
  }
}

export enum LogLevel {
  ERROR = 0,
  INFO = 1,
  DEBUG = 2,
}

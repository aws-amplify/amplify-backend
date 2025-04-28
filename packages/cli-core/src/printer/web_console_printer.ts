// write an implementation for Printer that takes a SocketIo and emits data using spinners

import { ColorName, format } from '../format/format.js';
import { LogLevel, Printer } from './printer.js';
import { Server } from 'socket.io';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Convert from 'ansi-to-html';
import { randomUUID } from 'crypto';
import showdown from 'showdown';
import { CloudWatchLogEvent } from '@aws-amplify/platform-core';

/**
 * The class that pretty prints to the output stream.
 */
export class WebConsolePrinter implements Printer {
  private currentSpinner: { id: string; timeout: NodeJS.Timeout } | undefined =
    undefined;
  private converter = new Convert({ newline: true, fg: '#000000' });
  private mdToHtmlConverter = new showdown.Converter();
  /**
   * Sets default configs
   */
  constructor(
    private readonly minimumLogLevel: LogLevel,
    readonly io: Server,
  ) {}

  logCloudWatch = (
    tag: string,
    event: CloudWatchLogEvent,
    color?: ColorName,
  ) => {
    this.io.emit('cloudWatchEvent', {
      tag,
      event,
      color,
    });
  };

  /**
   * Not required for web console.
   */
  printNewLine = () => {};

  /**
   * Prints a given message to output stream followed by a newline.
   * If a spinner is running, honor it and keep the spinner at the cursor running
   */
  print = (message: string) => {
    this.io.emit('logMessage', this.htmlify(message));
  };

  /**
   * Logs a message to the output stream at the given log level followed by a newline
   */
  log = (message: string, level: LogLevel = LogLevel.INFO) => {
    const doLogMessage = level <= this.minimumLogLevel;

    if (!doLogMessage) {
      return;
    }

    this.print(this.prefixedMessage(message, level));
  };

  logMarkdown = (message: string) => {
    this.io.emit('logMessage', this.mdToHtmlConverter.makeHtml(message));
  };

  /**
   * Logs a message with animated spinner
   * If stdout is not a TTY, the message is logged at the info level without a spinner
   */
  indicateProgress = async (
    message: string,
    callback: () => Promise<void>,
    successMessage?: string,
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
    options: { timeoutSeconds: number } = { timeoutSeconds: 60 },
  ): void => {
    // Can only run one spinner at a time. //TBD, in web console we don't have this limitation
    if (this.isSpinnerRunning()) {
      this.stopSpinner();
    }
    this.currentSpinner = {
      id: randomUUID(),
      timeout: setTimeout(() => {
        this.stopSpinner();
      }, options.timeoutSeconds * 1000),
    };
    this.io.emit('startSpinner', {
      id: this.currentSpinner.id,
      message: this.htmlify(message),
      prefixText: this.htmlify(this.getLogPrefix()),
    });
  };

  isSpinnerRunning = (): boolean => {
    return this.currentSpinner !== undefined;
  };

  /**
   * Stop the current running spinner
   */
  stopSpinner = (successMessage?: string): void => {
    if (successMessage) {
      this.io.emit('stopSpinner', {
        id: this.currentSpinner?.id,
        message: this.htmlify(this.prefixedMessage(successMessage)),
      });
    } else {
      this.io.emit('stopSpinner', {
        id: this.currentSpinner?.id,
      });
    }
    clearTimeout(this.currentSpinner?.timeout);
    this.currentSpinner = undefined;
  };

  /**
   * Update the current running spinner options, e.g. message or prefixText
   */
  updateSpinner = (options: {
    message?: string;
    prefixText?: string;
  }): void => {
    if (this.currentSpinner === undefined) {
      this.log(`No running spinner found.`, LogLevel.WARN);
      // // Maybe timed out? If the message was available, we start a new one
      if (options.message) {
        this.startSpinner(options.message);
        this.updateSpinner({ prefixText: options.prefixText });
      }
      return;
    }
    if (options.prefixText) {
      this.io.emit('updateSpinner', {
        id: this.currentSpinner.id,
        prefixText: this.htmlify(options.prefixText + this.getLogPrefix()),
      });
    } else if (options.message) {
      this.io.emit('updateSpinner', {
        id: this.currentSpinner.id,
        message: this.htmlify(options.message),
      });
    }
    // Refresh the timer
    this.currentSpinner.timeout?.refresh();
  };

  /**
   * Clears the console
   */
  clearConsole = () => {
    this.io.emit('clearConsole');
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

  private htmlify = (msg: unknown): string => {
    const stringMsg = this.stringify(msg);
    return this.converter.toHtml(stringMsg.replace(/ {2}/g, ' &#xa0;'));
  };

  private getLogPrefix = (level = LogLevel.INFO) => {
    let logPrefixFormatFn = format.dim;
    if (level <= LogLevel.WARN) {
      logPrefixFormatFn = (prefix: string) => {
        const prefixColor: ColorName =
          level === LogLevel.ERROR ? 'Red' : 'Yellow';
        return format.bold(
          format.color(`${prefix} [${LogLevel[level]}]`, prefixColor),
        );
      };
    }
    return logPrefixFormatFn(new Date().toLocaleTimeString());
  };

  private prefixedMessage = (message: string, level = LogLevel.INFO) => {
    return `${this.getLogPrefix(level)} ${message}`;
  };
}

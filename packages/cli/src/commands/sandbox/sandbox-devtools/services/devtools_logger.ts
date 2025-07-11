import { LogLevel, Printer } from '@aws-amplify/cli-core';
import { Server } from 'socket.io';
import stripAnsi from 'strip-ansi';

/**
 * Type for log event data
 */
type LogEventData = {
  timestamp: string;
  level: string;
  message: string;
};

/**
 * DevTools logger that streams logs to Socket.IO clients
 */
export class DevToolsLogger extends Printer {
  /**
   * Creates an instance of DevToolsLogger.
   * @param originalPrinter The original printer instance to delegate logging.
   * @param io The Socket.IO server instance for emitting log events.
   */
  private _minimumLogLevel: LogLevel;

  /**
   * Constructs a new DevToolsLogger.
   * @param originalPrinter The original printer instance to delegate logging.
   * @param io The Socket.IO server instance for emitting log events.
   * @param minimumLogLevel The minimum log level for emitting logs.
   */
  constructor(
    private originalPrinter: Printer,
    private io: Server,
    minimumLogLevel: LogLevel,
  ) {
    super(minimumLogLevel);
    this._minimumLogLevel = minimumLogLevel;
  }

  /**
   * Logs a message and emits it to the client.
   * @param message The message to log.
   * @param level The log level.
   */
  log = (message: string, level?: LogLevel) => {
    this.originalPrinter.log(message, level);
    // Not using shorthand because 0 is a valid log level (LogLevel.INFO) but falsy
    if (level !== undefined) {
      this.emitToClient(message, level);
    } else {
      this.emitToClient(message, LogLevel.INFO);
    }
  };

  /**
   * Prints a message and emits it to the client.
   */
  print = (message: string) => {
    this.originalPrinter.print(message);
    this.emitToClient(message, LogLevel.INFO);
  };

  /**
   * Starts a spinner and emits the message to the client.
   */
  startSpinner = (message: string, options?: { timeoutSeconds: number }) => {
    this.originalPrinter.startSpinner(message, options);
    this.emitToClient(message, LogLevel.INFO);
  };

  /**
   * Stops the spinner and emits the success message to the client if provided.
   */
  stopSpinner = (successMessage?: string) => {
    this.originalPrinter.stopSpinner(successMessage);
    if (successMessage) {
      this.emitToClient(successMessage, LogLevel.INFO);
    }
  };

  /**
   * Updates the spinner and emits any new messages to the client.
   */
  updateSpinner = (options: { message?: string; prefixText?: string }) => {
    this.originalPrinter.updateSpinner(options);
    if (options.message) {
      this.emitToClient(options.message, LogLevel.INFO);
    }
    if (options.prefixText) {
      this.emitToClient(options.prefixText, LogLevel.INFO);
    }
  };

  private emitToClient(message: string, level: LogLevel) {
    if (level > this._minimumLogLevel) {
      return;
    }
    const cleanMessage = stripAnsi(message);
    const logData: LogEventData = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message: cleanMessage,
    };
    this.io.emit('log', logData);
  }
}

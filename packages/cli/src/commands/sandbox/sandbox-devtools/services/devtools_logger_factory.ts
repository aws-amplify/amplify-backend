import { LogLevel, Printer } from '@aws-amplify/cli-core';
import { Server } from 'socket.io';
import { DevToolsLogger } from './devtools_logger.js';

/**
 * Factory for creating DevToolsLogger instances
 */
export class DevToolsLoggerFactory {
  /**
   * Creates an instance of DevToolsLoggerFactory.
   * @param printer The original printer instance to delegate logging.
   * @param minimumLogLevel The minimum log level for emitting logs.
   */
  constructor(
    private readonly printer: Printer,
    private readonly minimumLogLevel: LogLevel,
  ) {}

  /**
   * Creates a new DevToolsLogger instance
   * @param io The Socket.IO server instance for emitting log events.
   * @returns A new DevToolsLogger instance
   */
  createLogger(io: Server): DevToolsLogger {
    return new DevToolsLogger(this.printer, io, this.minimumLogLevel);
  }
}

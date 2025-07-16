import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { DevToolsLoggerFactory } from './devtools_logger_factory.js';
import { DevToolsLogger } from './devtools_logger.js';
import { LogLevel, Printer } from '@aws-amplify/cli-core';
import { Server } from 'socket.io';

void describe('DevToolsLoggerFactory', () => {
  void it('creates a logger with the provided printer and log level', () => {
    const mockPrinterLog = mock.fn();
    const mockPrinterPrint = mock.fn();
    const mockPrinter = {
      log: mockPrinterLog,
      print: mockPrinterPrint,
    } as unknown as Printer;

    const mockIoEmit = mock.fn();
    const mockIo = { emit: mockIoEmit } as unknown as Server;

    const minimumLogLevel = LogLevel.INFO;

    const factory = new DevToolsLoggerFactory(mockPrinter, minimumLogLevel);

    const logger = factory.createLogger(mockIo);

    assert.ok(logger instanceof DevToolsLogger);

    logger.log('Test message');

    assert.strictEqual(mockPrinterLog.mock.callCount(), 1);
  });
});

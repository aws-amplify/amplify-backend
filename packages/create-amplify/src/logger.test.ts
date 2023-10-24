import { describe, it } from 'node:test';
import assert from 'assert';
import { LogLevel, Logger } from './logger.js';

void describe('Logger', () => {
  void it('logs a message at INFO level', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };
    const logger = new Logger(mockConsole as never, LogLevel.INFO);
    await logger.info('Test log message');
    assert.equal(mockConsole.log.mock.callCount(), 1);
    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`\\[INFO\\].*: Test log message`)
    );
  });

  void it('do NOT logs a debug message at INFO level', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };
    const logger = new Logger(mockConsole as never, LogLevel.INFO);
    await logger.debug('Test log message');
    assert.equal(mockConsole.log.mock.callCount(), 0);
  });

  void it('logs a debug message at DEBUG level', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };

    const logger = new Logger(mockConsole as never, LogLevel.DEBUG);
    await logger.debug('Test log message');

    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`\\[DEBUG\\].*: Test log message`)
    );
  });

  void it('logs a debug message when VERBOSE is passed to the arguments', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };

    const mockArgs = {
      debug: false,
      verbose: true,
    };

    const mockMinimumLogLevel =
      mockArgs.debug || mockArgs.verbose ? LogLevel.DEBUG : LogLevel.INFO;

    const logger = new Logger(mockConsole as never, mockMinimumLogLevel);
    await logger.debug('Test log message');
    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`\\[DEBUG\\].*: Test log message`)
    );
  });
});

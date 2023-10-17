import { describe, it } from 'node:test';
import assert from 'assert';
import yargs from 'yargs';
import { LogLevel, Logger } from './logger.js';

void describe('Logger', () => {
  void it('logs a message at INFO level', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };
    const logger = new Logger(LogLevel.INFO, mockConsole as never);
    await logger.log('Test log message', LogLevel.INFO);
    assert.equal(mockConsole.log.mock.callCount(), 1);
    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`\\[INFO\\].*: Test log message`)
    );
    mockConsole.log.mock.restore();
  });

  void it('does not log a message below the minimum log level', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };
    const logger = new Logger(LogLevel.ERROR, mockConsole as never);
    await logger.log('Test log message', LogLevel.INFO);
    assert.equal(mockConsole.log.mock.callCount(), 0);
  });

  void it('logs a message with debug enabled', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };

    ctx.mock.method(yargs(), 'options', () => ({
      debug: true,
      verbose: false,
    }));

    const logger = new Logger(LogLevel.INFO, mockConsole as never);
    await logger.log('Test log message', LogLevel.INFO);

    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`\\[INFO\\].*: Test log message`)
    );
  });

  void it('logs a message with verbose enabled', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };

    ctx.mock.method(yargs(), 'options', () => ({
      debug: false,
      verbose: true,
    }));

    const logger = new Logger(LogLevel.INFO, mockConsole as never);
    await logger.log('Test log message', LogLevel.INFO);
    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`\\[INFO\\].*: Test log message`)
    );
  });
});

import { describe, it } from 'node:test';
import assert from 'assert';
import { LogLevel, Logger } from './logger.js';

void describe('Logger', () => {
  void it('logs a message at INFO level', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };
    const logger = new Logger(mockConsole as never, {});
    await logger.info('Test log message');
    assert.equal(mockConsole.log.mock.callCount(), 1);
    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`\\[INFO\\].*: Test log message`)
    );
  });

  void it('do NOT logs a message at DEBUG level', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };
    const logger = new Logger(mockConsole as never, {});
    await logger.debug('Test log message');
    assert.equal(mockConsole.log.mock.callCount(), 0);
  });

  void it('logs a message with debug enabled', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };

    const logger = new Logger(mockConsole as never, {
      debug: true,
    });
    await logger.info('Test log message');

    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`\\[INFO\\].*: Test log message`)
    );
  });

  void it('logs a message with verbose enabled', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };

    const logger = new Logger(mockConsole as never, {
      debug: false,
      verbose: true,
    });
    await logger.log('Test log message', LogLevel.INFO);
    await logger.info('Test log message');
    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`\\[INFO\\].*: Test log message`)
    );
  });
});

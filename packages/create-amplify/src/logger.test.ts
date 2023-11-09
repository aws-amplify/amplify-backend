import { describe, it, mock } from 'node:test';
import assert from 'assert';
import { EscapeSequence, LogLevel, Logger } from './logger.js';
import * as os from 'os';

void describe('Logger', () => {
  void it('logs a message at INFO level', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };
    const mockStdout = {
      write: mock.fn(),
    };
    const logger = new Logger(
      mockConsole as never,
      LogLevel.INFO,
      mockStdout as never
    );
    await logger.info('Test log message');
    assert.equal(mockConsole.log.mock.callCount(), 1);
    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`Test log message`)
    );
  });

  void it('do NOT logs a debug message at INFO level', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };
    const mockStdout = {
      write: mock.fn(),
    };
    const logger = new Logger(
      mockConsole as never,
      LogLevel.INFO,
      mockStdout as never
    );
    await logger.debug('Test log message');
    assert.equal(mockConsole.log.mock.callCount(), 0);
  });

  void it('logs a debug message at DEBUG level', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };
    const mockStdout = {
      write: mock.fn(),
    };

    const logger = new Logger(
      mockConsole as never,
      LogLevel.DEBUG,
      mockStdout as never
    );
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
    const mockStdout = {
      write: mock.fn(),
    };

    const mockArgs = {
      debug: false,
      verbose: true,
    };

    const mockMinimumLogLevel =
      mockArgs.debug || mockArgs.verbose ? LogLevel.DEBUG : LogLevel.INFO;

    const logger = new Logger(
      mockConsole as never,
      mockMinimumLogLevel,
      mockStdout as never
    );
    await logger.debug('Test log message');
    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`\\[DEBUG\\].*: Test log message`)
    );
  });

  void it('animating ellipsis is a noop in non-TTY terminal and instead logs a message at INFO level', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };
    const mockStdout = {
      write: mock.fn(),
    };

    const logger = new Logger(
      mockConsole as never,
      LogLevel.INFO,
      mockStdout as never
    );

    mock.method(logger, 'isTTY', () => false);
    await logger.startAnimatingEllipsis('Test log message');
    await logger.stopAnimatingEllipsis();

    assert.equal(mockStdout.write.mock.callCount(), 0);
    assert.equal(mockConsole.log.mock.callCount(), 1);
    assert.match(
      [...mockConsole.log.mock.calls[0].arguments][0] ?? '',
      new RegExp(`Test log message`)
    );
  });

  void it('start animating ellipsis with message and stops animation in TTY terminal', async (ctx) => {
    const mockConsole = {
      log: ctx.mock.fn(() => undefined),
    };
    const mockStdout = {
      write: mock.fn(),
    };

    const logger = new Logger(
      mockConsole as never,
      LogLevel.INFO,
      mockStdout as never
    );
    const mockWriteEscapeSequence = mock.fn();
    mock.method(logger, 'isTTY', () => true);
    mock.method(logger, 'writeEscapeSequence', mockWriteEscapeSequence);
    await logger.startAnimatingEllipsis('Test log message');
    // Wait for default refresh rate plus small delta
    await new Promise((resolve) => setTimeout(resolve, 500 + 10));
    await logger.stopAnimatingEllipsis();

    assert.equal(mockConsole.log.mock.callCount(), 0);
    assert.equal(mockStdout.write.mock.callCount(), 3);
    assert.equal(mockWriteEscapeSequence.mock.callCount(), 5);

    assert.match(
      [...mockStdout.write.mock.calls[0].arguments][0],
      new RegExp(`Test log message`)
    );
    assert.match(
      [...mockStdout.write.mock.calls[1].arguments][0],
      new RegExp(`Test log message.`)
    );
    assert.match(
      [...mockStdout.write.mock.calls[2].arguments][0],
      new RegExp('Test log message...')
    );
  });
});

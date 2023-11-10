import { describe, it, mock } from 'node:test';
import assert from 'assert';
import { LogLevel, Logger } from './logger.js';

void describe('Logger', () => {
  void it('logs a message at INFO level', () => {
    const mockStdout = {
      write: mock.fn(),
    };
    const logger = new Logger(mockStdout as never, LogLevel.INFO);
    logger.info('Test log message');
    assert.equal(mockStdout.write.mock.callCount(), 1);
    assert.match(
      [...mockStdout.write.mock.calls[0].arguments][0] ?? '',
      new RegExp(`Test log message`)
    );
  });

  void it('do NOT logs a debug message at INFO level', () => {
    const mockStdout = {
      write: mock.fn(),
    };
    const logger = new Logger(mockStdout as never, LogLevel.INFO);
    logger.debug('Test log message');
    assert.equal(mockStdout.write.mock.callCount(), 0);
  });

  void it('logs a debug message at DEBUG level', () => {
    const mockStdout = {
      write: mock.fn(),
    };

    const logger = new Logger(mockStdout as never, LogLevel.DEBUG);
    logger.debug('Test log message');

    assert.match(
      [...mockStdout.write.mock.calls[0].arguments][0] ?? '',
      new RegExp(`\\[DEBUG\\].*: Test log message`)
    );
  });

  void it('animating ellipsis is a noop in non-TTY terminal and instead logs a message at INFO level', async () => {
    const mockStdout = {
      write: mock.fn(),
    };
    const mockLog = mock.fn();

    const logger = new Logger(mockStdout as never, LogLevel.INFO);

    mock.method(logger, 'isTTY', () => false);
    mock.method(logger, 'log', mockLog);
    await logger.withEllipsis('Test log message', () => Promise.resolve());

    assert.equal(mockStdout.write.mock.callCount(), 0);
    assert.equal(mockLog.mock.callCount(), 1);
    assert.match(
      [...mockLog.mock.calls[0].arguments][0],
      new RegExp('Test log message')
    );
    assert.equal(mockLog.mock.calls[0].arguments[1], LogLevel.INFO);
  });

  void it('start animating ellipsis with message and stops animation in TTY terminal', async () => {
    const mockStdout = {
      write: mock.fn(),
    };
    const mockWriteEscapeSequence = mock.fn();

    const logger = new Logger(mockStdout as never, LogLevel.INFO);

    mock.method(logger, 'isTTY', () => true);
    mock.method(logger, 'writeEscapeSequence', mockWriteEscapeSequence);
    await logger.withEllipsis('Test log message', async () => {
      // Wait for default refresh rate plus small delta
      await new Promise((resolve) => setTimeout(resolve, 500 + 10));
    });

    assert.equal(mockStdout.write.mock.callCount(), 3);
    assert.equal(mockWriteEscapeSequence.mock.callCount(), 6);

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

  void it('throws if animating another message with ellipsis before old one is done', async () => {
    const mockStdout = {
      write: mock.fn(),
    };
    const mockWriteEscapeSequence = mock.fn();

    const logger = new Logger(mockStdout as never, LogLevel.INFO);

    mock.method(logger, 'isTTY', () => true);
    mock.method(logger, 'writeEscapeSequence', mockWriteEscapeSequence);
    await logger.withEllipsis('Test log message', async () => {
      // call withEllipsis again during first one
      await assert.rejects(
        () =>
          logger.withEllipsis('Another log message', async () => {
            await new Promise((resolve) => setTimeout(resolve, 500 + 10));
          }),
        {
          message:
            'Timer is already set to animate ellipsis, stop the current running timer before starting a new one.',
        }
      );
      await new Promise((resolve) => setTimeout(resolve, 500 + 10));
    });
  });
});

import { beforeEach, describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { LogLevel, Logger, LoggerInterface } from './logger.js';

void describe('Logger', () => {
  let logger: Logger;
  let mockConsole: MockConsole;

  void beforeEach(() => {
    mockConsole = new MockConsole();
  });

  void describe('Log level ERROR', () => {
    void beforeEach(() => {
      logger = new Logger(LogLevel.ERROR, mockConsole);
    });

    void it('Logger.error calls console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 1);
    });

    void it('Logger.info does not call console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 0);
    });

    void it('Logger.debug does not call console.debug', async () => {
      logger.debug('foo');
      strictEqual(mockConsole.debugCount, 0);
    });
  });

  void describe('Log level INFO', () => {
    void beforeEach(() => {
      logger = new Logger(LogLevel.INFO, mockConsole);
    });

    void it('Logger.error calls console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 1);
    });

    void it('Logger.info calls console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 1);
    });

    void it('Logger.debug does not call console.debug', async () => {
      logger.debug('foo');
      strictEqual(mockConsole.debugCount, 0);
    });
  });

  void describe('Log level DEBUG', () => {
    void beforeEach(() => {
      logger = new Logger(LogLevel.DEBUG, mockConsole);
    });

    void it('Logger.error calls console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 1);
    });

    void it('Logger.info calls console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 1);
    });

    void it('Logger.debug calls console.debug', async () => {
      logger.debug('foo');
      strictEqual(mockConsole.debugCount, 1);
    });
  });

  void describe('Log level NONE', () => {
    void beforeEach(() => {
      logger = new Logger(LogLevel.NONE, mockConsole);
    });

    void it('Logger.error does not call console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 0);
    });

    void it('Logger.info does not call console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 0);
    });

    void it('Logger.debug does not call console.debug', async () => {
      logger.debug('foo');
      strictEqual(mockConsole.debugCount, 0);
    });
  });
});

class MockConsole implements LoggerInterface {
  public errorCount = 0;
  public infoCount = 0;
  public debugCount = 0;
  error(): void {
    this.errorCount++;
  }
  info(): void {
    this.infoCount++;
  }
  debug(): void {
    this.debugCount++;
  }
}

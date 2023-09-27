import { after, beforeEach, describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { LogLevel, Logger } from './logger.js';

void describe('Logger', () => {
  let logger: Logger;
  let mockConsole: MockConsole;
  const oldConsole = console;

  void beforeEach(() => {
    mockConsole = new MockConsole();
    // eslint-disable-next-line no-global-assign
    console = mockConsole;
  });

  void after(() => {
    // eslint-disable-next-line no-global-assign
    console = oldConsole;
  });

  void describe('Log level ERROR', () => {
    void beforeEach(() => {
      logger = new Logger(LogLevel.ERROR);
    });

    void it('Logger.error calls console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 1);
    });

    void it('Logger.info does not call console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 0);
    });

    void it('Logger.debug does not call console.trace', async () => {
      logger.debug('foo');
      strictEqual(mockConsole.debugCount, 0);
    });
  });

  void describe('Log level INFO', () => {
    void beforeEach(() => {
      logger = new Logger(LogLevel.INFO);
    });

    void it('Logger.error calls console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 1);
    });

    void it('Logger.info calls console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 1);
    });

    void it('Logger.debug does not call console.trace', async () => {
      logger.debug('foo');
      strictEqual(mockConsole.debugCount, 0);
    });
  });

  void describe('Log level DEBUG', () => {
    void beforeEach(() => {
      logger = new Logger(LogLevel.DEBUG);
    });

    void it('Logger.error calls console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 1);
    });

    void it('Logger.info calls console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 1);
    });

    void it('Logger.debug calls console.trace', async () => {
      logger.debug('foo');
      strictEqual(mockConsole.debugCount, 1);
    });
  });

  void describe('Log level NONE', () => {
    void beforeEach(() => {
      logger = new Logger(LogLevel.NONE);
    });

    void it('Logger.error does not call console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 0);
    });

    void it('Logger.info does not call console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 0);
    });

    void it('Logger.debug does not call console.trace', async () => {
      logger.debug('foo');
      strictEqual(mockConsole.debugCount, 0);
    });
  });
});

class MockConsole {
  public errorCount = 0;
  public infoCount = 0;
  public debugCount = 0;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Console: console.ConsoleConstructor;
  assert(): void {
    throw new Error('Method not implemented.');
  }
  clear(): void {
    throw new Error('Method not implemented.');
  }
  count(): void {
    throw new Error('Method not implemented.');
  }
  countReset(): void {
    throw new Error('Method not implemented.');
  }
  debug(): void {
    throw new Error('Method not implemented.');
  }
  dir(): void {
    throw new Error('Method not implemented.');
  }
  dirxml(): void {
    throw new Error('Method not implemented.');
  }
  error(): void {
    this.errorCount++;
  }
  group(): void {
    throw new Error('Method not implemented.');
  }
  groupCollapsed(): void {
    throw new Error('Method not implemented.');
  }
  groupEnd(): void {
    throw new Error('Method not implemented.');
  }
  info(): void {
    this.infoCount++;
  }
  log(): void {
    throw new Error('Method not implemented.');
  }
  table(): void {
    throw new Error('Method not implemented.');
  }
  time(): void {
    throw new Error('Method not implemented.');
  }
  timeEnd(): void {
    throw new Error('Method not implemented.');
  }
  timeLog(): void {
    throw new Error('Method not implemented.');
  }
  trace(): void {
    this.debugCount++;
  }
  warn(): void {
    throw new Error('Method not implemented.');
  }
  profile(): void {
    throw new Error('Method not implemented.');
  }
  profileEnd(): void {
    throw new Error('Method not implemented.');
  }
  timeStamp(): void {
    throw new Error('Method not implemented.');
  }
}

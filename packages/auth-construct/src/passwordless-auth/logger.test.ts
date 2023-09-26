import { after, beforeEach, describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { LogLevel, Logger } from './logger.js';

describe('Logger', () => {
  let logger: Logger;
  let mockConsole: MockConsole;
  const oldConsole = console;

  beforeEach(() => {
    mockConsole = new MockConsole();
    // eslint-disable-next-line no-global-assign
    console = mockConsole;
  });

  after(() => {
    // eslint-disable-next-line no-global-assign
    console = oldConsole;
  });

  describe('Log level ERROR', () => {
    beforeEach(() => {
      logger = new Logger(LogLevel.ERROR);
    });

    it('Logger.error calls console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 1);
    });

    it('Logger.info does not call console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 0);
    });

    it('Logger.debug does not call console.trace', async () => {
      logger.debug('foo');
      strictEqual(mockConsole.debugCount, 0);
    });
  });

  describe('Log level INFO', () => {
    beforeEach(() => {
      logger = new Logger(LogLevel.INFO);
    });

    it('Logger.error calls console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 1);
    });

    it('Logger.info calls console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 1);
    });

    it('Logger.debug does not call console.trace', async () => {
      logger.debug('foo');
      strictEqual(mockConsole.debugCount, 0);
    });
  });

  describe('Log level DEBUG', () => {
    beforeEach(() => {
      logger = new Logger(LogLevel.DEBUG);
    });

    it('Logger.error calls console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 1);
    });

    it('Logger.info calls console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 1);
    });

    it('Logger.debug calls console.trace', async () => {
      logger.debug('foo');
      strictEqual(mockConsole.debugCount, 1);
    });
  });

  describe('Log level NONE', () => {
    beforeEach(() => {
      logger = new Logger(LogLevel.NONE);
    });

    it('Logger.error does not call console.error', async () => {
      logger.error('foo');
      strictEqual(mockConsole.errorCount, 0);
    });

    it('Logger.info does not call console.info', async () => {
      logger.info('foo');
      strictEqual(mockConsole.infoCount, 0);
    });

    it('Logger.debug does not call console.trace', async () => {
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

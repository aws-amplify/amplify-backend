import { after, beforeEach, describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { LogLevel, Logger } from './logger.js';
import { InspectOptions } from 'util';

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
  Console: console.ConsoleConstructor;
  assert(_: any, __?: string | undefined, ...___: any[]): void {
    throw new Error('Method not implemented.');
  }
  clear(): void {
    throw new Error('Method not implemented.');
  }
  count(_?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  countReset(_?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  debug(_?: any, ...__: any[]): void {
    throw new Error('Method not implemented.');
  }
  dir(_: any, __?: InspectOptions | undefined): void {
    throw new Error('Method not implemented.');
  }
  dirxml(..._: any[]): void {
    throw new Error('Method not implemented.');
  }
  error(_?: any, ...__: any[]): void {
    this.errorCount++;
  }
  group(..._: any[]): void {
    throw new Error('Method not implemented.');
  }
  groupCollapsed(..._: any[]): void {
    throw new Error('Method not implemented.');
  }
  groupEnd(): void {
    throw new Error('Method not implemented.');
  }
  info(_?: any, ...__: any[]): void {
    this.infoCount++;
  }
  log(_?: any, ...__: any[]): void {
    throw new Error('Method not implemented.');
  }
  table(_: any, __?: readonly string[] | undefined): void {
    throw new Error('Method not implemented.');
  }
  time(_?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  timeEnd(_?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  timeLog(_?: string | undefined, ...data: any[]): void {
    throw new Error('Method not implemented.');
  }
  trace(_?: any, ...__: any[]): void {
    this.debugCount++;
  }
  warn(_?: any, ...__: any[]): void {
    throw new Error('Method not implemented.');
  }
  profile(_?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  profileEnd(_?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  timeStamp(_?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
}

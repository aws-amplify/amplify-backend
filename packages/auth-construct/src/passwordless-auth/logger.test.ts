import { after, beforeEach, describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { LogLevel, Logger } from './logger.js';
import { InspectOptions } from 'util';

describe('Logger', () => {
  var logger: Logger;
  var mockConsole: MockConsole;
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
  assert(
    value: any,
    message?: string | undefined,
    ...optionalParams: any[]
  ): void {
    throw new Error('Method not implemented.');
  }
  clear(): void {
    throw new Error('Method not implemented.');
  }
  count(label?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  countReset(label?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  debug(message?: any, ...optionalParams: any[]): void {
    throw new Error('Method not implemented.');
  }
  dir(obj: any, options?: InspectOptions | undefined): void {
    throw new Error('Method not implemented.');
  }
  dirxml(...data: any[]): void {
    throw new Error('Method not implemented.');
  }
  error(message?: any, ...optionalParams: any[]): void {
    this.errorCount++;
  }
  group(...label: any[]): void {
    throw new Error('Method not implemented.');
  }
  groupCollapsed(...label: any[]): void {
    throw new Error('Method not implemented.');
  }
  groupEnd(): void {
    throw new Error('Method not implemented.');
  }
  info(message?: any, ...optionalParams: any[]): void {
    this.infoCount++;
  }
  log(message?: any, ...optionalParams: any[]): void {
    throw new Error('Method not implemented.');
  }
  table(tabularData: any, properties?: readonly string[] | undefined): void {
    throw new Error('Method not implemented.');
  }
  time(label?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  timeEnd(label?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  timeLog(label?: string | undefined, ...data: any[]): void {
    throw new Error('Method not implemented.');
  }
  trace(message?: any, ...optionalParams: any[]): void {
    this.debugCount++;
  }
  warn(message?: any, ...optionalParams: any[]): void {
    throw new Error('Method not implemented.');
  }
  profile(label?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  profileEnd(label?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
  timeStamp(label?: string | undefined): void {
    throw new Error('Method not implemented.');
  }
}

import { after, before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import { LogLevel, Printer } from './printer.js';

void describe('Printer', () => {
  const mockedWrite = mock.method(process.stdout, 'write');
  let originalWrite: typeof process.stdout.write;

  before(() => {
    originalWrite = process.stdout.write;
    process.stdout.write = mockedWrite;
  });

  after(() => {
    // restore write function after all tests.
    process.stdout.write = originalWrite;
  });

  beforeEach(() => {
    mockedWrite.mock.resetCalls();
  });

  void it('log should print message followed by new line', () => {
    new Printer(LogLevel.INFO).log('hello world');
    assert.strictEqual(mockedWrite.mock.callCount(), 2);
    assert.match(
      mockedWrite.mock.calls[0].arguments[0].toString(),
      /hello world/
    );
    assert.match(mockedWrite.mock.calls[1].arguments[0].toString(), /\n/);
  });

  void it('log should not print debug logs by default', () => {
    new Printer(LogLevel.INFO).log('hello world', LogLevel.DEBUG);
    assert.strictEqual(mockedWrite.mock.callCount(), 0);
  });

  void it('log should print debug logs when printer is configured with minimum log level >= DEBUG', () => {
    new Printer(LogLevel.DEBUG).log('hello world', LogLevel.DEBUG);
    assert.strictEqual(mockedWrite.mock.callCount(), 2);
    assert.match(
      mockedWrite.mock.calls[0].arguments[0].toString(),
      /hello world/
    );
    assert.match(mockedWrite.mock.calls[1].arguments[0].toString(), /\n/);
  });

  void it('log should not print debug logs by default', () => {
    new Printer(LogLevel.INFO).log('hello world', LogLevel.DEBUG);
    assert.strictEqual(mockedWrite.mock.callCount(), 0);
  });

  void it('start animating spinner with message and stops animation in TTY terminal', async () => {
    process.stdout.isTTY = true;

    const message = 'Message 1';

    await new Printer(LogLevel.INFO).indicateProgress(message, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    const logMessages = mockedWrite.mock.calls
      .filter((message) => message.arguments.toString().match(/Message/))
      .map((call) => call.arguments.toString());

    logMessages.forEach((message) => {
      assert.match(message, /Message(.*)/);
    });
  });

  void it('animating spinner is a noop in non-TTY terminal and instead logs a message at INFO level', async () => {
    process.stdout.isTTY = false;

    const message = 'Message 1';

    await new Printer(LogLevel.INFO).indicateProgress(message, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    const logMessages = mockedWrite.mock.calls
      .filter((message) => message.arguments.toString().match(/Message/))
      .map((call) => call.arguments.toString());

    assert.strictEqual(logMessages.length, 1);
    assert.strictEqual(logMessages[0], 'Message 1');
  });

  void it('indicateProgress stops spinner and propagates error when action fails', async () => {
    process.stdout.isTTY = true;

    const errorMessage = 'Error message';
    const message = 'Message 1';
    let errorCaught = false;

    try {
      await new Printer(LogLevel.INFO).indicateProgress(message, async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        throw new Error(errorMessage);
      });
    } catch (error) {
      assert.strictEqual((error as Error).message, errorMessage);
      errorCaught = true;
    }
    assert.strictEqual(errorCaught, true, 'Expected error was not thrown.');
  });
});

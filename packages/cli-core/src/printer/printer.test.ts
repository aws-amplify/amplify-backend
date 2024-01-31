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

  void it('log should print message without new line', () => {
    new Printer(LogLevel.INFO).log('hello world', LogLevel.INFO, false);
    assert.strictEqual(mockedWrite.mock.callCount(), 1);
    assert.match(
      mockedWrite.mock.calls[0].arguments[0].toString(),
      /hello world/
    );
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

  void it('indicateProgress logs message & animates ellipsis if on TTY', async () => {
    process.stdout.isTTY = true;
    await new Printer(LogLevel.INFO).indicateProgress(
      'loading a long list',
      () => new Promise((resolve) => setTimeout(resolve, 3000))
    );
    // filter out the escape characters.
    const logMessages = mockedWrite.mock.calls
      .filter((message) =>
        message.arguments.toString().match(/loading a long list/)
      )
      .map((call) => call.arguments.toString());

    logMessages.forEach((message) => {
      assert.match(message, /loading a long list(.*)/);
    });
  });

  void it('indicateProgress does not animates ellipsis if not TTY & prints log message once', async () => {
    process.stdout.isTTY = false;
    await new Printer(LogLevel.INFO).indicateProgress(
      'loading a long list',
      () => new Promise((resolve) => setTimeout(resolve, 1500))
    );
    // filter out the escape characters.
    const logMessages = mockedWrite.mock.calls
      .filter((message) =>
        message.arguments.toString().match(/loading a long list/)
      )
      .map((call) => call.arguments.toString());

    assert.strictEqual(logMessages.length, 1);
    assert.match(logMessages[0], /loading a long list/);
  });
});

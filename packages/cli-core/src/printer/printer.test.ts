import { after, before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import { LogLevel, Printer } from './printer.js';
import tty from 'node:tty';

void describe('Printer', () => {
  const mockedWrite = mock.method(process.stdout, 'write');
  let originalWrite: typeof process.stdout.write;
  const mockedTTYWrite = mock.fn();
  const ttyStream: tty.WriteStream = {
    cursorTo: mock.fn(),
    _write: mock.fn(),
    write: mockedTTYWrite,
    isTTY: true,
    clearLine: mock.fn(),
  } as unknown as tty.WriteStream;

  before(() => {
    originalWrite = process.stdout.write;
    process.stdout.write = mockedWrite;
  });

  after(() => {
    // restore write function after all tests.
    process.stdout.write = originalWrite;
  });

  beforeEach(() => {
    mockedTTYWrite.mock.resetCalls();
    mockedWrite.mock.resetCalls();
  });

  void it('log should print message followed by new line', () => {
    new Printer(LogLevel.INFO).log('hello world');
    assert.strictEqual(mockedWrite.mock.callCount(), 2);
    assert.match(
      mockedWrite.mock.calls[0].arguments[0].toString(),
      /hello world/,
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
      /hello world/,
    );
    assert.match(mockedWrite.mock.calls[1].arguments[0].toString(), /\n/);
  });

  void it('log should not print debug logs by default', () => {
    new Printer(LogLevel.INFO).log('hello world', LogLevel.DEBUG);
    assert.strictEqual(mockedWrite.mock.callCount(), 0);
  });

  void it('indicateProgress start animating spinner with message and stops animation in TTY terminal', async () => {
    const message = 'Message 1';

    await new Printer(
      LogLevel.INFO,
      ttyStream,
      process.stderr,
      50,
      true,
    ).indicateProgress(message, async () => {
      await new Promise((resolve) => setTimeout(resolve, 90));
    });

    const logMessages = mockedTTYWrite.mock.calls
      .filter((message) => message.arguments.toString().match(/Message/))
      .map((call) => call.arguments.toString());

    assert.deepStrictEqual(
      logMessages.length,
      2,
      `logs were: ${JSON.stringify(logMessages, null, 2)}`,
    );
    logMessages.forEach((message) => {
      assert.match(message, /Message(.*)/);
    });
  });

  void it('indicateProgress animating spinner is a noop in non-TTY terminal and instead logs a message at INFO level', async () => {
    const message = 'Message 1';

    await new Printer(
      LogLevel.INFO,
      process.stdout,
      process.stderr,
      50,
      false, // explicitly disable tty
    ).indicateProgress(message, async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const logMessages = mockedWrite.mock.calls
      .filter((message) => message.arguments.toString().match(/Message/))
      .map((call) => call.arguments.toString());

    assert.strictEqual(
      logMessages.length,
      1,
      `logs were: ${JSON.stringify(logMessages, null, 2)}`,
    );
    assert.match(logMessages[0], /Message(.*)/);
  });

  void it('indicateProgress stops spinner and propagates error when action fails', async () => {
    const errorMessage = 'Error message';
    const message = 'Message 1';
    let errorCaught = false;
    const ttyStream: tty.WriteStream = {
      cursorTo: mock.fn(),
      _write: mock.fn(),
      write: mock.fn(),
    } as unknown as tty.WriteStream;
    try {
      await new Printer(LogLevel.INFO, ttyStream).indicateProgress(
        message,
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          throw new Error(errorMessage);
        },
      );
    } catch (error) {
      assert.strictEqual((error as Error).message, errorMessage);
      errorCaught = true;
    }
    assert.strictEqual(errorCaught, true, 'Expected error was not thrown.');
  });

  void it('startSpinner start animating spinner with message until stopSpinner is called in TTY terminal', async () => {
    const message = 'Message 1';

    // Refresh rate of 500 ms to avoid flakiness in tests
    const printer = new Printer(
      LogLevel.INFO,
      ttyStream,
      process.stderr,
      500,
      true,
    );
    printer.startSpinner(message);

    // Wait for 1900 ms which should guarantee spinner outputting exactly 4 times at 0, 500, 1000, 1500
    await new Promise((resolve) => setTimeout(resolve, 1900));

    // Stop spinner
    printer.stopSpinner();

    const logMessages = mockedTTYWrite.mock.calls
      .filter((message) => message.arguments.toString().match(/Message/))
      .map((call) => call.arguments.toString());

    // In 200 ms, the mockedTTYWrite should have been called 4 times (refreshed)
    assert.deepStrictEqual(
      logMessages.length,
      4,
      `logs were: ${JSON.stringify(logMessages, null, 2)}`,
    );
    logMessages.forEach((message) => {
      assert.match(message, /Message(.*)/);
    });
  });

  void it('startSpinner only logs once when called in non-TTY terminal', async () => {
    const message = 'Message 1';

    // Refresh rate of 50 ms
    const printer = new Printer(
      LogLevel.INFO,
      process.stdout,
      process.stderr,
      50,
      false, // simulate non-tty
    );
    printer.startSpinner(message);

    // Wait for 190 ms such that tty would have caused multiple prints
    await new Promise((resolve) => setTimeout(resolve, 190));

    // Stop spinner
    printer.stopSpinner();

    // Instead of 4 times on tty, there should be only 1 log printed
    const logMessages = mockedWrite.mock.calls
      .filter((message) => message.arguments.toString().match(/Message/))
      .map((call) => call.arguments.toString());

    assert.deepStrictEqual(
      logMessages.length,
      1,
      `logs were: ${JSON.stringify(logMessages, null, 2)}`,
    );
    logMessages.forEach((message) => {
      assert.match(message, /Message(.*)/);
    });
  });

  void it('startSpinner times out if the stop is never called within timeout', async () => {
    const message = 'Message 1';

    // Refresh rate of 50 ms
    const printer = new Printer(
      LogLevel.INFO,
      ttyStream,
      process.stderr,
      50,
      true,
    );
    printer.startSpinner(message, {
      timeoutSeconds: 0.1,
    });
    assert.ok(printer.isSpinnerRunning());
    // Wait for 110 ms for the spinner to timeout
    await new Promise((resolve) => setTimeout(resolve, 110));
    assert.ok(!printer.isSpinnerRunning());
  });

  void it('updateSpinner refreshes the times out', async () => {
    const message = 'Message 1';

    // Refresh rate of 50 ms
    const printer = new Printer(
      LogLevel.INFO,
      ttyStream,
      process.stderr,
      50,
      true,
    );
    printer.startSpinner(message, {
      timeoutSeconds: 0.1,
    });
    assert.ok(printer.isSpinnerRunning());
    // Wait for 70 ms so the spinner doesn't timeout
    await new Promise((resolve) => setTimeout(resolve, 70));
    printer.updateSpinner({ prefixText: 'some test' });
    // Wait for another 70 ms and test that spinner is still alive
    await new Promise((resolve) => setTimeout(resolve, 70));
    assert.ok(printer.isSpinnerRunning());

    // 30 ms later the spinner should timeout
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.ok(!printer.isSpinnerRunning());
  });

  void it('invalid spinner ids do not wreak havoc', async () => {
    // Refresh rate of 50 ms
    const printer = new Printer(LogLevel.INFO, ttyStream, ttyStream, 10, true);
    assert.ok(!printer.isSpinnerRunning());

    printer.updateSpinner({ prefixText: 'some test' });
    assert.match(
      mockedTTYWrite.mock.calls[0].arguments[0].toString(),
      /No running spinner found./,
    );
    printer.stopSpinner();
  });

  void it('updateSpinner updates the animating spinner with a prefixText in TTY terminal', async () => {
    const message = 'Message 1';

    // Refresh rate of 50 ms
    const printer = new Printer(
      LogLevel.INFO,
      ttyStream,
      process.stderr,
      50,
      true,
    );
    printer.startSpinner(message);
    printer.updateSpinner({
      prefixText: 'this is some prefix text',
    });

    // wait for 50 secs for spinner to get a chance to update the prefix text
    await new Promise((resolve) => setTimeout(resolve, 55));
    // Stop spinner
    printer.stopSpinner();

    const logMessages = mockedTTYWrite.mock.calls
      .filter((message) => message.arguments.toString().match(/Message/))
      .map((call) => call.arguments.toString());

    assert.deepStrictEqual(
      logMessages.length,
      2,
      `logs were: ${JSON.stringify(logMessages, null, 2)}`,
    );
    // Both logs should have the `message` value
    logMessages.forEach((message) => {
      assert.match(message, /Message(.*)/);
    });
    // second log should have prefix as well
    assert.match(logMessages[1], /this is some prefix text/);
  });
});

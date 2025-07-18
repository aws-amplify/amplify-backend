import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { LogLevel, Printer } from '@aws-amplify/cli-core';
import { DevToolsLogger } from './devtools_logger.js';
import { Server } from 'socket.io';

// Define a type for the mock function to make TypeScript happy
type MockFn = ReturnType<typeof mock.fn>;

// Type for log event data that's emitted by the DevToolsLogger
type LogEventData = {
  timestamp: string;
  level: string;
  message: string;
};

void describe('DevToolsLogger', () => {
  let devToolsLogger: DevToolsLogger;
  let mockOriginalPrinter: Printer;
  let mockIo: Server;
  const minimumLogLevel = LogLevel.INFO;

  beforeEach(() => {
    mock.reset();

    // Create mock for Printer
    mockOriginalPrinter = {
      log: mock.fn(),
      print: mock.fn(),
      startSpinner: mock.fn(),
      stopSpinner: mock.fn(),
      updateSpinner: mock.fn(),
    } as unknown as Printer;

    // Create mock for Socket.IO server
    mockIo = {
      emit: mock.fn(),
    } as unknown as Server;

    // Create the DevToolsLogger instance
    devToolsLogger = new DevToolsLogger(
      mockOriginalPrinter,
      mockIo,
      minimumLogLevel,
    );
  });

  void describe('constructor', () => {
    void it('creates an instance with provided parameters', () => {
      assert.ok(devToolsLogger);
    });

    void it('sets minimum log level correctly', () => {
      const debugLogger = new DevToolsLogger(
        mockOriginalPrinter,
        mockIo,
        LogLevel.DEBUG,
      );
      assert.ok(debugLogger);

      const errorLogger = new DevToolsLogger(
        mockOriginalPrinter,
        mockIo,
        LogLevel.ERROR,
      );
      assert.ok(errorLogger);
    });
  });

  void describe('log', () => {
    void it('delegates to original printer', () => {
      const testMessage = 'Test log message';

      devToolsLogger.log(testMessage);

      const mockLogFn = mockOriginalPrinter.log as unknown as MockFn;
      assert.strictEqual(mockLogFn.mock.callCount(), 1);
      assert.deepStrictEqual(mockLogFn.mock.calls[0].arguments, [
        testMessage,
        undefined,
      ]);
    });

    void it('delegates to original printer with specified log level', () => {
      const testMessage = 'Test log message with level';
      const testLevel = LogLevel.WARN;

      devToolsLogger.log(testMessage, testLevel);

      const mockLogFn = mockOriginalPrinter.log as unknown as MockFn;
      assert.strictEqual(mockLogFn.mock.callCount(), 1);
      assert.deepStrictEqual(mockLogFn.mock.calls[0].arguments, [
        testMessage,
        testLevel,
      ]);
    });

    void it('emits log event to Socket.IO clients', () => {
      const testMessage = 'Test log message for socket';

      devToolsLogger.log(testMessage);

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);
      assert.strictEqual(mockEmitFn.mock.calls[0].arguments[0], 'log');

      const logData = mockEmitFn.mock.calls[0].arguments[1] as LogEventData;
      assert.strictEqual(logData.message, testMessage);
      assert.strictEqual(logData.level, 'INFO');
      assert.ok(logData.timestamp); // Ensure timestamp exists
    });

    void it('emits log event with specified log level', () => {
      const testMessage = 'Test log message with level for socket';
      const testLevel = LogLevel.WARN;

      devToolsLogger.log(testMessage, testLevel);

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);
      assert.strictEqual(mockEmitFn.mock.calls[0].arguments[0], 'log');

      const logData = mockEmitFn.mock.calls[0].arguments[1] as LogEventData;
      assert.strictEqual(logData.message, testMessage);
      assert.strictEqual(logData.level, 'WARN');
      assert.ok(logData.timestamp);
    });

    void it('respects minimum log level when emitting events', () => {
      // Create a new logger with INFO as minimum level
      const infoLevelLogger = new DevToolsLogger(
        mockOriginalPrinter,
        mockIo,
        LogLevel.INFO,
      );

      // This should be emitted (same as minimum level)
      infoLevelLogger.log('Info message', LogLevel.INFO);

      // This should be emitted (higher than minimum level)
      infoLevelLogger.log('Error message', LogLevel.ERROR);

      // This should not be emitted (lower than minimum level)
      infoLevelLogger.log('Debug message', LogLevel.DEBUG);

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 2); // Only 2 messages should be emitted

      // Verify the call arguments
      assert.ok(mockEmitFn.mock.calls.length >= 2);

      const firstLogData = mockEmitFn.mock.calls[0]
        .arguments[1] as LogEventData;
      assert.strictEqual(firstLogData.message, 'Info message');
      assert.strictEqual(firstLogData.level, 'INFO');

      const secondLogData = mockEmitFn.mock.calls[1]
        .arguments[1] as LogEventData;
      assert.strictEqual(secondLogData.message, 'Error message');
      assert.strictEqual(secondLogData.level, 'ERROR');
    });

    void it('strips ANSI escape codes from messages', () => {
      const ansiMessage = '\u001b[31mThis is red\u001b[0m';
      const cleanMessage = 'This is red';

      devToolsLogger.log(ansiMessage);

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      const logData = mockEmitFn.mock.calls[0].arguments[1] as LogEventData;
      assert.strictEqual(logData.message, cleanMessage);
    });
  });

  void describe('print', () => {
    void it('delegates to original printer', () => {
      const testMessage = 'Test print message';

      devToolsLogger.print(testMessage);

      const mockPrintFn = mockOriginalPrinter.print as unknown as MockFn;
      assert.strictEqual(mockPrintFn.mock.callCount(), 1);
      assert.deepStrictEqual(mockPrintFn.mock.calls[0].arguments, [
        testMessage,
      ]);
    });

    void it('emits log event to Socket.IO clients', () => {
      const testMessage = 'Test print message for socket';

      devToolsLogger.print(testMessage);

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);
      assert.strictEqual(mockEmitFn.mock.calls[0].arguments[0], 'log');

      const logData = mockEmitFn.mock.calls[0].arguments[1] as LogEventData;
      assert.strictEqual(logData.message, testMessage);
      assert.strictEqual(logData.level, 'INFO');
      assert.ok(logData.timestamp);
    });
  });

  void describe('startSpinner', () => {
    void it('delegates to original printer', () => {
      const spinnerMessage = 'Loading...';
      const options = { timeoutSeconds: 30 };

      devToolsLogger.startSpinner(spinnerMessage, options);

      const mockStartSpinnerFn =
        mockOriginalPrinter.startSpinner as unknown as MockFn;
      assert.strictEqual(mockStartSpinnerFn.mock.callCount(), 1);
      assert.deepStrictEqual(mockStartSpinnerFn.mock.calls[0].arguments, [
        spinnerMessage,
        options,
      ]);
    });

    void it('emits log event to Socket.IO clients', () => {
      const spinnerMessage = 'Loading...';

      devToolsLogger.startSpinner(spinnerMessage);

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);
      assert.strictEqual(mockEmitFn.mock.calls[0].arguments[0], 'log');

      const logData = mockEmitFn.mock.calls[0].arguments[1] as LogEventData;
      assert.strictEqual(logData.message, spinnerMessage);
      assert.strictEqual(logData.level, 'INFO');
      assert.ok(logData.timestamp);
    });
  });

  void describe('stopSpinner', () => {
    void it('delegates to original printer', () => {
      const successMessage = 'Operation completed!';

      devToolsLogger.stopSpinner(successMessage);

      const mockStopSpinnerFn =
        mockOriginalPrinter.stopSpinner as unknown as MockFn;
      assert.strictEqual(mockStopSpinnerFn.mock.callCount(), 1);
      assert.deepStrictEqual(mockStopSpinnerFn.mock.calls[0].arguments, [
        successMessage,
      ]);
    });

    void it('emits log event to Socket.IO clients when success message is provided', () => {
      const successMessage = 'Operation completed!';

      devToolsLogger.stopSpinner(successMessage);

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);
      assert.strictEqual(mockEmitFn.mock.calls[0].arguments[0], 'log');

      const logData = mockEmitFn.mock.calls[0].arguments[1] as LogEventData;
      assert.strictEqual(logData.message, successMessage);
      assert.strictEqual(logData.level, 'INFO');
      assert.ok(logData.timestamp);
    });

    void it('does not emit log event when success message is not provided', () => {
      devToolsLogger.stopSpinner();

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 0);
    });
  });

  void describe('updateSpinner', () => {
    void it('delegates to original printer', () => {
      const options = {
        message: 'Updating...',
        prefixText: 'Step 2:',
      };

      devToolsLogger.updateSpinner(options);

      const mockUpdateSpinnerFn =
        mockOriginalPrinter.updateSpinner as unknown as MockFn;
      assert.strictEqual(mockUpdateSpinnerFn.mock.callCount(), 1);
      assert.deepStrictEqual(mockUpdateSpinnerFn.mock.calls[0].arguments, [
        options,
      ]);
    });

    void it('emits log events for message and prefixText', () => {
      const options = {
        message: 'Updating...',
        prefixText: 'Step 2:',
      };

      devToolsLogger.updateSpinner(options);

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 2); // One for message, one for prefixText

      assert.strictEqual(mockEmitFn.mock.calls[0].arguments[0], 'log');
      const messageLogData = mockEmitFn.mock.calls[0]
        .arguments[1] as LogEventData;
      assert.strictEqual(messageLogData.message, 'Updating...');

      assert.strictEqual(mockEmitFn.mock.calls[1].arguments[0], 'log');
      const prefixLogData = mockEmitFn.mock.calls[1]
        .arguments[1] as LogEventData;
      assert.strictEqual(prefixLogData.message, 'Step 2:');
    });

    void it('emits log event only for provided options', () => {
      // Test with only message
      devToolsLogger.updateSpinner({ message: 'Only message' });

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      const messageLogData = mockEmitFn.mock.calls[0]
        .arguments[1] as LogEventData;
      assert.strictEqual(messageLogData.message, 'Only message');

      // Reset mock for next test
      (mockEmitFn as MockFn).mock.resetCalls();

      // Test with only prefixText
      devToolsLogger.updateSpinner({ prefixText: 'Only prefix' });

      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      const prefixLogData = mockEmitFn.mock.calls[0]
        .arguments[1] as LogEventData;
      assert.strictEqual(prefixLogData.message, 'Only prefix');
    });

    void it('does not emit log event when no text options are provided', () => {
      devToolsLogger.updateSpinner({});

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 0);
    });
  });

  void describe('integration with sandbox logs', () => {
    void it('emits sandbox log messages to socket clients', () => {
      const sandboxLogMessage = '[Sandbox] Deployed function: hello-world';

      devToolsLogger.log(sandboxLogMessage, LogLevel.INFO);

      const mockLogFn = mockOriginalPrinter.log as unknown as MockFn;
      assert.strictEqual(mockLogFn.mock.callCount(), 1);
      assert.deepStrictEqual(mockLogFn.mock.calls[0].arguments, [
        sandboxLogMessage,
        LogLevel.INFO,
      ]);

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      const logData = mockEmitFn.mock.calls[0].arguments[1] as LogEventData;
      assert.strictEqual(logData.message, sandboxLogMessage);
      assert.strictEqual(logData.level, 'INFO');
    });
  });

  void describe('full flow testing', () => {
    void it('logs to terminal and UI for all log levels above minimum', () => {
      // Create a new logger with WARN as minimum level
      const warnLevelLogger = new DevToolsLogger(
        mockOriginalPrinter,
        mockIo,
        LogLevel.WARN,
      );

      // This should log to terminal but not emit to UI (lower than minimum)
      warnLevelLogger.log('Info message', LogLevel.INFO);

      // These should log to terminal and emit to UI (>= minimum level)
      warnLevelLogger.log('Warn message', LogLevel.WARN);
      warnLevelLogger.log('Error message', LogLevel.ERROR);

      const mockLogFn = mockOriginalPrinter.log as unknown as MockFn;
      assert.strictEqual(mockLogFn.mock.callCount(), 3); // All messages should log to terminal

      const mockEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 2); // Only WARN and ERROR should emit to UI

      // Verify the emitted log events
      assert.ok(mockEmitFn.mock.calls.length >= 2);

      const firstLogData = mockEmitFn.mock.calls[0]
        .arguments[1] as LogEventData;
      assert.strictEqual(firstLogData.message, 'Warn message');
      assert.strictEqual(firstLogData.level, 'WARN');

      const secondLogData = mockEmitFn.mock.calls[1]
        .arguments[1] as LogEventData;
      assert.strictEqual(secondLogData.message, 'Error message');
      assert.strictEqual(secondLogData.level, 'ERROR');
    });
  });
});

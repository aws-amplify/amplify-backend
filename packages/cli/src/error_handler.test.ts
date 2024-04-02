import { after, before, beforeEach, describe, it, mock } from 'node:test';
import {
  attachUnhandledExceptionListeners,
  generateCommandFailureHandler,
} from './error_handler.js';
import { Argv } from 'yargs';
import { LogLevel, printer } from '@aws-amplify/cli-core';
import assert from 'node:assert';
import { AmplifyUserError } from '@aws-amplify/platform-core';

const mockPrint = mock.method(printer, 'print');
const mockLog = mock.method(printer, 'log');

void describe('generateCommandFailureHandler', () => {
  const mockShowHelp = mock.fn();
  const mockExit = mock.fn();

  const parser = {
    showHelp: mockShowHelp,
    exit: mockExit,
  } as unknown as Argv;

  beforeEach(() => {
    mockPrint.mock.resetCalls();
    mockLog.mock.resetCalls();
    mockShowHelp.mock.resetCalls();
    mockExit.mock.resetCalls();
  });

  void it('prints specified message with undefined error', () => {
    const someMsg = 'some msg';
    // undefined error is encountered with --help option.
    generateCommandFailureHandler(parser)(
      someMsg,
      undefined as unknown as Error
    );
    assert.equal(mockPrint.mock.callCount(), 1);
    assert.equal(mockShowHelp.mock.callCount(), 1);
    assert.equal(mockExit.mock.callCount(), 1);
    assert.match(mockPrint.mock.calls[0].arguments[0], new RegExp(someMsg));
  });

  void it('prints message from error object', () => {
    const errMsg = 'some error msg';
    generateCommandFailureHandler(parser)('', new Error(errMsg));
    assert.equal(mockPrint.mock.callCount(), 1);
    assert.equal(mockShowHelp.mock.callCount(), 1);
    assert.equal(mockExit.mock.callCount(), 1);
    assert.match(
      mockPrint.mock.calls[0].arguments[0] as string,
      new RegExp(errMsg)
    );
  });

  void it('handles a prompt force close error', () => {
    generateCommandFailureHandler(parser)(
      '',
      new Error('User force closed the prompt')
    );
    assert.equal(mockExit.mock.callCount(), 1);
    assert.equal(mockPrint.mock.callCount(), 0);
  });

  void it('prints error cause message, if any', () => {
    const errorMessage = 'this is the upstream cause';
    generateCommandFailureHandler(parser)(
      '',
      new Error('some error msg', { cause: new Error(errorMessage) })
    );
    assert.equal(mockExit.mock.callCount(), 1);
    assert.equal(mockPrint.mock.callCount(), 2);
    assert.match(
      mockPrint.mock.calls[1].arguments[0] as string,
      new RegExp(errorMessage)
    );
  });

  void it('prints AmplifyErrors', () => {
    generateCommandFailureHandler(parser)(
      '',
      new AmplifyUserError('TestName', {
        message: 'test error message',
        resolution: 'test resolution',
        details: 'test details',
      })
    );

    assert.equal(mockExit.mock.callCount(), 1);
    assert.equal(mockPrint.mock.callCount(), 3);
    assert.match(
      mockPrint.mock.calls[0].arguments[0],
      /TestName: test error message/
    );
    assert.equal(
      mockPrint.mock.calls[1].arguments[0],
      'Resolution: test resolution'
    );
    assert.equal(mockPrint.mock.calls[2].arguments[0], 'Details: test details');
  });

  void it('prints debug stack traces', () => {
    const causeError = new Error('test underlying cause error');
    const amplifyError = new AmplifyUserError(
      'TestName',
      {
        message: 'test error message',
        resolution: 'test resolution',
        details: 'test details',
      },
      causeError
    );
    generateCommandFailureHandler(parser)('', amplifyError);
    assert.equal(mockExit.mock.callCount(), 1);
    assert.equal(mockLog.mock.callCount(), 2);
    assert.deepStrictEqual(mockLog.mock.calls[0].arguments, [
      amplifyError.stack,
      LogLevel.DEBUG,
    ]);
    assert.deepStrictEqual(mockLog.mock.calls[1].arguments, [
      causeError.stack,
      LogLevel.DEBUG,
    ]);
  });
});

void describe('attachUnhandledExceptionListeners', { concurrency: 1 }, () => {
  before(() => {
    attachUnhandledExceptionListeners();
  });

  beforeEach(() => {
    mockPrint.mock.resetCalls();
  });

  after(() => {
    // remove the exception listeners that were added during setup
    process.listeners('unhandledRejection').pop();
    process.listeners('uncaughtException').pop();
  });
  void it('handles rejected errors', () => {
    process.listeners('unhandledRejection').at(-1)?.(
      new Error('test error'),
      Promise.resolve()
    );
    assert.ok(
      mockPrint.mock.calls.findIndex((call) =>
        call.arguments[0].includes('test error')
      ) >= 0
    );
    expectProcessExitCode1AndReset();
  });

  void it('handles rejected strings', () => {
    process.listeners('unhandledRejection').at(-1)?.(
      'test error',
      Promise.resolve()
    );
    assert.ok(
      mockPrint.mock.calls.findIndex((call) =>
        call.arguments[0].includes('test error')
      ) >= 0
    );
    expectProcessExitCode1AndReset();
  });

  void it('handles rejected symbols of other types', () => {
    process.listeners('unhandledRejection').at(-1)?.(
      { something: 'weird' },
      Promise.resolve()
    );
    assert.ok(
      mockPrint.mock.calls.findIndex((call) =>
        call.arguments[0].includes(
          'Error: Unhandled rejection of type [object]'
        )
      ) >= 0
    );
    expectProcessExitCode1AndReset();
  });

  void it('handles uncaught errors', () => {
    process.listeners('uncaughtException').at(-1)?.(
      new Error('test error'),
      'uncaughtException'
    );
    assert.ok(
      mockPrint.mock.calls.findIndex((call) =>
        call.arguments[0].includes('test error')
      ) >= 0
    );
    expectProcessExitCode1AndReset();
  });

  void it('does nothing when called multiple times', () => {
    // note the first call happened in the before() setup

    const unhandledRejectionListenerCount =
      process.listenerCount('unhandledRejection');
    const uncaughtExceptionListenerCount =
      process.listenerCount('uncaughtException');

    attachUnhandledExceptionListeners();
    attachUnhandledExceptionListeners();

    assert.equal(
      process.listenerCount('unhandledRejection'),
      unhandledRejectionListenerCount
    );
    assert.equal(
      process.listenerCount('uncaughtException'),
      uncaughtExceptionListenerCount
    );
  });
});

const expectProcessExitCode1AndReset = () => {
  assert.equal(process.exitCode, 1);
  process.exitCode = 0;
};

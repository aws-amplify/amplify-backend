import { afterEach, describe, it, mock } from 'node:test';
import { generateCommandFailureHandler } from './command_failure_handler.js';
import { Argv } from 'yargs';
import { COLOR, Printer } from '@aws-amplify/cli-core';
import assert from 'node:assert';
import { InvalidCredentialError } from './error/credential_error.js';

void describe('handleCommandFailure', { concurrency: 1 }, () => {
  afterEach(() => {
    expectProcessExitCode1AndReset();
  });
  void it('prints specified message with undefined error', (contextual) => {
    const mockPrint = contextual.mock.method(Printer, 'print');
    const mockShowHelp = mock.fn();
    const mockExit = mock.fn();
    const parser = {
      showHelp: mockShowHelp,
      exit: mockExit,
    } as unknown as Argv;
    const someMsg = 'some msg';
    // undefined error is encountered with --help option.
    generateCommandFailureHandler(parser)(
      someMsg,
      undefined as unknown as Error
    );
    assert.equal(mockPrint.mock.callCount(), 1);
    assert.equal(mockShowHelp.mock.callCount(), 1);
    assert.equal(mockExit.mock.callCount(), 1);
    assert.deepStrictEqual(mockPrint.mock.calls[0].arguments, [
      someMsg,
      COLOR.RED,
    ]);
  });

  void it('prints message from error object', (contextual) => {
    const mockPrint = contextual.mock.method(Printer, 'print');
    const mockShowHelp = mock.fn();
    const mockExit = mock.fn();
    const parser = {
      showHelp: mockShowHelp,
      exit: mockExit,
    } as unknown as Argv;
    const errMsg = 'some error msg';
    generateCommandFailureHandler(parser)('', new Error(errMsg));
    assert.equal(mockPrint.mock.callCount(), 1);
    assert.equal(mockShowHelp.mock.callCount(), 1);
    assert.equal(mockExit.mock.callCount(), 1);
    assert.match(mockPrint.mock.calls[0].arguments[0], new RegExp(errMsg));
    assert.equal(mockPrint.mock.calls[0].arguments[1], COLOR.RED);
  });

  void it('handles a prompt force close error', (contextual) => {
    const mockPrint = contextual.mock.method(Printer, 'print');
    const mockExit = mock.fn();
    const parser = {
      showHelp: mock.fn(),
      exit: mockExit,
    } as unknown as Argv;
    generateCommandFailureHandler(parser)(
      '',
      new Error('User force closed the prompt')
    );
    assert.equal(mockPrint.mock.callCount(), 0);
  });

  void it('handles a profile error', (contextual) => {
    const errMsg = 'some profile error';
    const mockPrint = contextual.mock.method(Printer, 'print');
    const mockExit = mock.fn();
    const parser = {
      showHelp: mock.fn(),
      exit: mockExit,
    } as unknown as Argv;
    generateCommandFailureHandler(parser)(
      '',
      new InvalidCredentialError(errMsg)
    );
    assert.equal(mockPrint.mock.callCount(), 1);
    assert.equal(mockExit.mock.callCount(), 1);
    assert.match(mockPrint.mock.calls[0].arguments[0], new RegExp(errMsg));
    assert.equal(mockPrint.mock.calls[0].arguments[1], COLOR.RED);
  });
});

const expectProcessExitCode1AndReset = () => {
  assert.equal(process.exitCode, 1);
  process.exitCode = 0;
};

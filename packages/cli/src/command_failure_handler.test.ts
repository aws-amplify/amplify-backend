import { describe, it, mock } from 'node:test';
import { handleCommandFailure } from './command_failure_handler.js';
import { Argv } from 'yargs';
import { COLOR, Printer } from '@aws-amplify/cli-core';
import assert from 'node:assert';

void describe('handleCommandFailure', () => {
  void it('prints a message', (contextual) => {
    const mockPrint = contextual.mock.method(Printer, 'print');
    const mockShowHelp = mock.fn();
    const args = {
      showHelp: mockShowHelp,
    };
    const someMsg = 'some msg';
    // undefined error is encountered with --help option.
    handleCommandFailure(
      someMsg,
      undefined as unknown as Error,
      args as unknown as Argv<object>
    );
    assert.equal(mockPrint.mock.callCount(), 1);
    assert.equal(mockShowHelp.mock.callCount(), 1);
    assert.deepStrictEqual(mockPrint.mock.calls[0].arguments, [
      someMsg,
      COLOR.RED,
    ]);
  });

  void it('prints a random error', (contextual) => {
    const mockPrint = contextual.mock.method(Printer, 'print');
    const mockShowHelp = mock.fn();
    const args = {
      showHelp: mockShowHelp,
    };
    const errMsg = 'some random error msg';
    handleCommandFailure(
      '',
      new Error(errMsg),
      args as unknown as Argv<object>
    );
    assert.equal(mockPrint.mock.callCount(), 1);
    assert.equal(mockShowHelp.mock.callCount(), 1);
    assert.match(mockPrint.mock.calls[0].arguments[0], new RegExp(errMsg));
    assert.equal(mockPrint.mock.calls[0].arguments[1], COLOR.RED);
  });

  void it('handles a prompt force close error', (contextual) => {
    const mockPrint = contextual.mock.method(Printer, 'print');
    handleCommandFailure(
      '',
      new Error('User force closed the prompt'),
      {} as unknown as Argv<object>
    );
    assert.equal(mockPrint.mock.callCount(), 0);
  });
});

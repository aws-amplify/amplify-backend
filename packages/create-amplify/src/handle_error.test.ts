import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import { printer } from '@aws-amplify/cli-core';
import { handleError } from './handle_error.js';

void describe('handleError', () => {
  const printerLogMock = mock.method(printer, 'log', () => undefined);
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    printerLogMock.mock.resetCalls();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  void it('does not log a prompt that the customer force closed', () => {
    handleError(new Error('User force closed the prompt with SIGINT'));

    assert.equal(printerLogMock.mock.callCount(), 0);
    assert.equal(process.exitCode, 1);
  });

  void it('logs any other error', () => {
    handleError(new Error('some other failure'));

    assert.equal(printerLogMock.mock.callCount(), 1);
    assert.match(
      printerLogMock.mock.calls[0].arguments[0] as string,
      /some other failure/,
    );
    assert.equal(process.exitCode, 1);
  });
});

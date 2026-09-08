import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HostingError } from './hosting_error.js';

void describe('HostingError', () => {
  void it('sets code, message, and resolution', () => {
    const error = new HostingError('TestErrorCode', {
      message: 'Something went wrong',
      resolution: 'Do this to fix it',
    });

    assert.strictEqual(error.code, 'TestErrorCode');
    assert.strictEqual(error.message, 'Something went wrong');
    assert.strictEqual(error.resolution, 'Do this to fix it');
  });

  void it('sets name to the error code (matches AmplifyUserError behavior)', () => {
    const error = new HostingError('InvalidBuildIdError', {
      message: 'Bad build ID',
      resolution: 'Fix the build ID',
    });

    assert.strictEqual(error.name, 'InvalidBuildIdError');
  });

  void it('sets cause when provided', () => {
    const cause = new Error('original error');
    const error = new HostingError(
      'WrappedError',
      { message: 'Wrapper', resolution: 'Fix it' },
      cause,
    );

    assert.strictEqual(error.cause, cause);
  });

  void it('does not set cause when not provided', () => {
    const error = new HostingError('NoCauseError', {
      message: 'No cause',
      resolution: 'None needed',
    });

    assert.strictEqual(error.cause, undefined);
  });

  void it('has name "HostingError" when code is HostingError', () => {
    const error = new HostingError('HostingError', {
      message: 'test',
      resolution: 'test',
    });
    assert.strictEqual(error.name, 'HostingError');
  });

  void it('is instanceof Error', () => {
    const error = new HostingError('SomeCode', {
      message: 'msg',
      resolution: 'res',
    });

    assert.ok(error instanceof Error);
    assert.ok(error instanceof HostingError);
  });

  void it('has a proper stack trace', () => {
    const error = new HostingError('StackTraceTest', {
      message: 'has stack',
      resolution: 'none',
    });

    assert.ok(error.stack);
    assert.ok(error.stack.includes('StackTraceTest'));
  });
});

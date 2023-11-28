import { describe, it } from 'node:test';
import { AmplifyError } from '.';
import assert from 'assert';
import * as util from 'util';

void describe('amplify error', () => {
  void it('serialize and deserialize correctly', () => {
    const testError = new AmplifyError(
      'SyntaxError',
      'ERROR',
      { message: 'test error message', details: 'test error details' },
      new AmplifyError('AccessDeniedError', 'FAULT', {
        message: 'some downstream error message',
      })
    );
    const sampleStderr = `some random stderr
before the actual error message
${util.inspect(testError, { depth: null })}
and some after the error message
    `;
    const actual = AmplifyError.fromStderr(sampleStderr);
    assert.deepStrictEqual(actual?.name, testError.name);
    assert.deepStrictEqual(actual?.classification, testError.classification);
    assert.deepStrictEqual(actual?.message, testError.message);
    assert.deepStrictEqual(actual?.details, testError.details);
    assert.deepStrictEqual(
      actual?.downstreamError?.name,
      testError.downstreamError?.name
    );
    assert.deepStrictEqual(
      actual?.downstreamError?.message,
      testError.downstreamError?.message
    );
  });
});

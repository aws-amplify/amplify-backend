import { describe, it } from 'node:test';
import { AmplifyError, AmplifyUserError } from '.';
import assert from 'assert';
import * as util from 'util';

void describe('amplify error', () => {
  void it('serialize and deserialize correctly', () => {
    const testError = new AmplifyUserError(
      'SyntaxError',
      { message: 'test error message', details: 'test error details' },
      new AmplifyUserError('AccessDeniedError', {
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
    assert.deepStrictEqual(actual?.cause?.name, testError.cause?.name);
    assert.deepStrictEqual(actual?.cause?.message, testError.cause?.message);
  });
});

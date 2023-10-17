import { describe, it } from 'node:test';
import { SecretError } from './secret_error.js';
import { ParameterNotFound } from '@aws-sdk/client-ssm';
import assert from 'node:assert';

void describe('SecretError', () => {
  void it('creates from SSM exception', () => {
    const ssmNotFoundException = new ParameterNotFound({
      $metadata: {
        httpStatusCode: 500,
      },
      message: 'ssm exception error message',
    });

    const expectedErr = new SecretError(JSON.stringify(ssmNotFoundException), {
      cause: ssmNotFoundException,
      httpStatusCode: ssmNotFoundException.$metadata.httpStatusCode,
    });

    const actualErr = SecretError.createInstance(ssmNotFoundException);
    assert.deepStrictEqual(actualErr, expectedErr);
  });

  void it('creates from non-ssm exception', () => {
    const randomError = new Error(`some random error`);
    const expectedErr = new SecretError(randomError.message, {
      cause: randomError,
    });

    const actualErr = SecretError.createInstance(randomError);
    assert.deepStrictEqual(actualErr, expectedErr);
  });
});

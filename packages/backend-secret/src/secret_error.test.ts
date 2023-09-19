import { describe, it } from 'node:test';
import { SecretError } from './secret_error.js';
import { SSMServiceException } from '@aws-sdk/client-ssm';
import assert from 'node:assert';

describe('SecretError', () => {
  it('creates from SSM exception', () => {
    const ssmException = {
      message: 'ssm exception error message',
      $metadata: {
        httpStatusCode: 500,
      },
    } as SSMServiceException;

    const expectedErr = new SecretError(JSON.stringify(ssmException), {
      cause: ssmException,
      httpStatusCode: ssmException.$metadata.httpStatusCode,
    });

    const actualErr = SecretError.fromSSMException(ssmException);
    assert.deepStrictEqual(actualErr, expectedErr);
  });
});

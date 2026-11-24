import { describe, test } from 'node:test';
import assert from 'node:assert';
import { SerializableError } from './serializable_error';

void describe('serializable error', () => {
  const canary = 'AMPX_TEST_CANARY_VALUE';

  class ErrorWithDetailsAndCode extends Error {
    constructor(
      public readonly message: string,
      public readonly details?: string,
      public readonly code?: string,
    ) {
      super(message);
    }
  }

  void test('that if code is available it is used as the error name', () => {
    const error = new ErrorWithDetailsAndCode(
      'some error message',
      undefined,
      'ErrorCode',
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(serializableError.name, 'ErrorCode');
  });

  void test('that error name is used if code is not available', () => {
    const error = new Error('some error message');
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(serializableError.name, 'Error');
  });

  void test('that AWS ARNs and stacks are escaped in error code', () => {
    const error = new ErrorWithDetailsAndCode(
      'some error message',
      undefined,
      // eslint-disable-next-line spellcheck/spell-checker
      'Code"arn:aws:service:region:123456789012:res"amplify-testapp-test-branch-1234abcd',
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(
      serializableError.name,
      'Code<escaped ARN><escaped stack>',
    );
  });

  void test('that error message, details and stack trace are not included', () => {
    const error = new ErrorWithDetailsAndCode(
      `message ${canary}`,
      `details ${canary}`,
    );
    error.name = 'InvalidCommandInputError';
    error.stack = `InvalidCommandInputError: ${canary}\n    at ${canary} (/${canary}/file.js:1:2)`;

    const serializableError = new SerializableError(error);
    const serialized = JSON.stringify(serializableError);

    assert.deepStrictEqual(JSON.parse(serialized), {
      name: 'InvalidCommandInputError',
    });
    assert.ok(!serialized.includes(canary), serialized);
  });
});

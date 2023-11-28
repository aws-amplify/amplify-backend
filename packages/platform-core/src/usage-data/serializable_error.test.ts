import { describe, test } from 'node:test';
import assert from 'node:assert';
import os from 'os';
import { SerializableError } from './serializable_error';

void describe('serializable error', () => {
  class ErrorWithDetailsAndCode extends Error {
    constructor(
      public readonly message: string,
      public readonly details?: string,
      public readonly code?: string
    ) {
      super(message);
    }
  }

  void test('that regular stack trace does not contain user homedir', () => {
    const error = new Error('test error');
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.trace);
    serializableError.trace?.forEach((trace) => {
      assert.ok(
        trace.file.includes(os.homedir()) == false,
        `${os.homedir()} is included in the ${trace.file}`
      );
    });
  });

  void test('that if code is available it is used as the error name', () => {
    const error = new ErrorWithDetailsAndCode(
      'some error message',
      undefined,
      'ErrorCode'
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(serializableError.name, 'ErrorCode');
  });

  void test('that error name is used if code is not available', () => {
    const error = new Error('some error message');
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(serializableError.name, 'Error');
  });

  void test('that no change in error details that does not have AWS ARNs', () => {
    const error = new ErrorWithDetailsAndCode(
      'some error message',
      'some error details that do not have ARNs'
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(
      serializableError.details,
      'some error details that do not have ARNs'
    );
  });

  void test('that ARNs are escaped when error details has two AWS ARNs', () => {
    const error = new ErrorWithDetailsAndCode(
      'some error message',
      'some error details with arn: arn:aws-cn:service:::resource/name and arn: arn:aws-iso:service:region::res and something else'
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(
      serializableError.details,
      'some error details with arn: <escaped ARN> and arn: <escaped ARN> and something else'
    );
  });

  void test('that error message is sanitized by removing invalid characters', () => {
    const error = new ErrorWithDetailsAndCode('some" er❌ror ""m"es❌sage❌');
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(serializableError.message, 'some error message');
  });
});

import { describe, test } from 'node:test';
import assert from 'node:assert';
import os from 'os';
import { pathToFileURL } from 'node:url';
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

  void test('that regular stack does not contain user homedir', () => {
    const error = new Error('test error');
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.stack);
    const matches = [...serializableError.stack.matchAll(new RegExp(os.homedir(), 'g'))];
    assert.ok(matches.length === 0, `${os.homedir()} is included in ${serializableError.stack}`);
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

  void test('that error message is sanitized by removing invalid characters', () => {
    const error = new ErrorWithDetailsAndCode('some" er❌ror ""m"es❌sage❌');
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(serializableError.message, 'some error message');
  });

  void test('that error message does not contain user homedir', () => {
    const error = new Error(`${process.cwd()} test error`);
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.message);
    const matches = [...serializableError.message.matchAll(new RegExp(os.homedir(), 'g'))];
    assert.ok(matches.length === 0, `${os.homedir()} is included in ${serializableError.message}`);
  });

  void test('that error message does not contain file url path with user homedir', () => {
    const error = new Error(`${pathToFileURL(process.cwd()).toString()} test error`);
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.message);
    const matches = [...serializableError.message.matchAll(new RegExp(os.homedir(), 'g'))];
    assert.ok(matches.length === 0, `${os.homedir()} is included in ${serializableError.message}`);
  });
});

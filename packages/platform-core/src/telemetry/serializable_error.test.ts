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

  void test('that error message is sanitized by removing invalid characters', () => {
    const error = new Error('some" er❌ror ""m"es❌sage❌');
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(serializableError.message, 'some error message');
  });

  void test('that error message does not contain user homedir', () => {
    const error = new Error(`${process.cwd()} test error`);
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.message);
    const matches = [
      ...serializableError.message.matchAll(new RegExp(os.homedir(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${os.homedir()} is included in ${serializableError.message}`,
    );
  });

  void test('that error message does not contain current working directory', () => {
    const error = new Error(`${process.cwd()} test error`);
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.message);
    const matches = [
      ...serializableError.message.matchAll(new RegExp(process.cwd(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${process.cwd()} is included in ${serializableError.message}`,
    );
  });

  void test('that error message does not contain file url path with user homedir', () => {
    const error = new Error(
      `${pathToFileURL(process.cwd()).toString()} test error`,
    );
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.message);
    const matches = [
      ...serializableError.message.matchAll(new RegExp(os.homedir(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${os.homedir()} is included in ${serializableError.message}`,
    );
  });

  void test('that error message does not contain file url path with current working directory', () => {
    const error = new Error(
      `${pathToFileURL(process.cwd()).toString()} test error`,
    );
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.message);
    const matches = [
      ...serializableError.message.matchAll(new RegExp(process.cwd(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${process.cwd()} is included in ${serializableError.message}`,
    );
  });

  void test('that error message does not contain arns', () => {
    const error = new Error(
      'User: arn:aws:iam::123456789012:user/test is not authorized to perform: test-action',
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(
      serializableError.message,
      'User: <escaped ARN> is not authorized to perform: test-action',
    );
  });

  void test('that error message does not contain stacks', () => {
    const error = new Error(
      // eslint-disable-next-line spellcheck/spell-checker
      'Stack with id amplify-test-stack-sandbox-12345abcde does not exist',
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(
      serializableError.message,
      'Stack with id <escaped stack> does not exist',
    );
  });

  void test('that error stack does not contain user homedir', () => {
    const error = new Error(`${process.cwd()} test error`);
    error.stack = `${error.stack}  at methodName (${process.cwd()}:12:34)\n`;
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.stack);
    const matches = [
      ...serializableError.stack.matchAll(new RegExp(os.homedir(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${os.homedir()} is included in ${serializableError.stack}`,
    );
  });

  void test('that error stack does not contain current working directory', () => {
    const error = new Error(`${process.cwd()} test error`);
    error.stack = `${error.stack}  at methodName (${process.cwd()}:12:34)\n`;
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.stack);
    const matches = [
      ...serializableError.stack.matchAll(new RegExp(process.cwd(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${process.cwd()} is included in ${serializableError.stack}`,
    );
  });

  void test('that error stack does not contain file url path with user homedir', () => {
    const error = new Error(
      `${pathToFileURL(process.cwd()).toString()} test error`,
    );
    error.stack = `${error.stack}  at methodName (${pathToFileURL(
      process.cwd(),
    ).toString()}/node_modules/@aws-amplify/test-package/lib/test.js:12:34)\n`;
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.stack);
    const matches = [
      ...serializableError.stack.matchAll(new RegExp(os.homedir(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${os.homedir()} is included in ${serializableError.stack}`,
    );
    const expectedFilePath =
      'node_modules/@aws-amplify/test-package/lib/test.js';
    assert.ok(
      serializableError.stack.includes(expectedFilePath),
      `${expectedFilePath} is not found in ${serializableError.stack}`,
    );
  });

  void test('that error stack does not contain file url path with current working directory', () => {
    const error = new Error(
      `${pathToFileURL(process.cwd()).toString()} test error`,
    );
    error.stack = `${error.stack}  at methodName (${pathToFileURL(
      process.cwd(),
    ).toString()}/node_modules/@aws-amplify/test-package/lib/test.js:12:34)\n`;
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.stack);
    const matches = [
      ...serializableError.stack.matchAll(new RegExp(process.cwd(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${process.cwd()} is included in ${serializableError.stack}`,
    );
    const expectedFilePath =
      'node_modules/@aws-amplify/test-package/lib/test.js';
    assert.ok(
      serializableError.stack.includes(expectedFilePath),
      `${expectedFilePath} is not found in ${serializableError.stack}`,
    );
  });

  void test('that error stack does not contain stacks', () => {
    const error = new Error('test error');
    error.stack =
      // eslint-disable-next-line spellcheck/spell-checker
      'Stack with id amplify-test-stack-sandbox-12345abcde does not exist';
    const serializableError = new SerializableError(error);
    assert.ok(
      serializableError.stack.includes(
        'Stack with id <escaped stack> does not exist',
      ),
      `Stack is not removed in ${serializableError.stack}`,
    );
  });
});

import { describe, test } from 'node:test';
import assert from 'node:assert';
import os from 'os';
import { SerializableError } from './serializable_error';
import { pathToFileURL } from 'node:url';

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

  void test('that regular stack trace does not contain user homedir', () => {
    const error = new Error('test error');
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.trace);
    serializableError.trace?.forEach((trace) => {
      assert.ok(
        trace.file.includes(os.homedir()) == false,
        `${os.homedir()} is included in the ${trace.file}`,
      );
    });
  });

  void test('that regular stack trace does not contain current working directory', () => {
    const error = new Error('test error');
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.trace);
    serializableError.trace?.forEach((trace) => {
      assert.ok(
        trace.file.includes(process.cwd()) == false,
        `${process.cwd()} is included in the ${trace.file}`,
      );
    });
  });

  void test('that regular stack trace does not contain user homedir for file url paths', () => {
    const error = new Error('test error');
    error.stack = `at methodName (${pathToFileURL(
      process.cwd(),
    ).toString()}/node_modules/@aws-amplify/test-package/lib/test.js:12:34)\n`;
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.trace);
    serializableError.trace?.forEach((trace) => {
      assert.ok(
        trace.file.includes(os.homedir()) == false,
        `${os.homedir()} is included in the ${trace.file}`,
      );
    });
  });

  void test('that regular stack trace does not contain current working directory for file url paths', () => {
    const error = new Error('test error');
    error.stack = `at methodName (${pathToFileURL(
      process.cwd(),
    ).toString()}/node_modules/@aws-amplify/test-package/lib/test.js:12:34)\n`;
    const serializableError = new SerializableError(error);
    assert.ok(serializableError.trace);
    serializableError.trace?.forEach((trace) => {
      assert.ok(
        trace.file.includes(process.cwd()) == false,
        `${process.cwd()} is included in the ${trace.file}`,
      );
    });
  });

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

  void test('that no change in error details that does not have AWS ARNs or stacks', () => {
    const error = new ErrorWithDetailsAndCode(
      'some error message',
      'some error details that do not have ARNs or stacks',
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(
      serializableError.details,
      'some error details that do not have ARNs or stacks',
    );
  });

  void test('that ARNs are escaped when error details has two AWS ARNs', () => {
    const error = new ErrorWithDetailsAndCode(
      'some error message',
      'some error details with arn: arn:aws-cn:service:::resource/name and arn: arn:aws-iso:service:region::res and something else',
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(
      serializableError.details,
      'some error details with arn: <escaped ARN> and arn: <escaped ARN> and something else',
    );
  });

  void test('that stacks are escaped when error details has two AWS stacks', () => {
    const error = new ErrorWithDetailsAndCode(
      'some error message',
      // eslint-disable-next-line spellcheck/spell-checker
      'some error details with stack: amplify-testapp-test-sandbox-1234abcd and stack: amplify-testapp-test-branch-1234abcd and something else',
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(
      serializableError.details,
      'some error details with stack: <escaped stack> and stack: <escaped stack> and something else',
    );
  });

  void test('that error message is sanitized by removing invalid characters', () => {
    const error = new ErrorWithDetailsAndCode('some" er❌ror ""m"es❌sage❌');
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(serializableError.message, 'some error message');
  });

  void test('that error message does not contain AWS ARNs or stacks', () => {
    const error = new ErrorWithDetailsAndCode(
      // eslint-disable-next-line spellcheck/spell-checker
      'test error with stack: amplify-testapp-test-branch-1234abcd and arn: arn:aws-iso:service:region::res',
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(
      serializableError.message,
      'test error with stack: <escaped stack> and arn: <escaped ARN>',
    );
  });

  void test('that error message does not contain user homedir', () => {
    const error = new ErrorWithDetailsAndCode(`${process.cwd()} test error`);
    const serializableError = new SerializableError(error);
    const matches = [
      ...serializableError.message.matchAll(new RegExp(os.homedir(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${os.homedir()} is included in ${serializableError.message}`,
    );
  });

  void test('that error message does not contain current working directory', () => {
    const error = new ErrorWithDetailsAndCode(`${process.cwd()} test error`);
    const serializableError = new SerializableError(error);
    const matches = [
      ...serializableError.message.matchAll(new RegExp(process.cwd(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${process.cwd()} is included in ${serializableError.message}`,
    );
  });

  void test('that error message does not contain file url path with user homedir', () => {
    const error = new ErrorWithDetailsAndCode(
      `${pathToFileURL(process.cwd()).toString()} test error`,
    );
    const serializableError = new SerializableError(error);
    const matches = [
      ...serializableError.message.matchAll(new RegExp(os.homedir(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${os.homedir()} is included in ${serializableError.message}`,
    );
  });

  void test('that error message does not contain file url path with current working directory', () => {
    const error = new ErrorWithDetailsAndCode(
      `${pathToFileURL(process.cwd()).toString()} test error`,
    );
    const serializableError = new SerializableError(error);
    const matches = [
      ...serializableError.message.matchAll(new RegExp(process.cwd(), 'g')),
    ];
    assert.ok(
      matches.length === 0,
      `${process.cwd()} is included in ${serializableError.message}`,
    );
  });

  void test('that error details do not contain user homedir', () => {
    const error = new ErrorWithDetailsAndCode(
      'test error',
      `${process.cwd()} test details`,
    );
    const serializableError = new SerializableError(error);
    const matches = serializableError.details
      ? [...serializableError.details.matchAll(new RegExp(os.homedir(), 'g'))]
      : [];
    assert.ok(
      serializableError.details && matches.length === 0,
      `${os.homedir()} is included in ${serializableError.details}`,
    );
  });

  void test('that error details do not contain current working directory', () => {
    const error = new ErrorWithDetailsAndCode(
      'test error',
      `${process.cwd()} test details`,
    );
    const serializableError = new SerializableError(error);
    const matches = serializableError.details
      ? [...serializableError.details.matchAll(new RegExp(process.cwd(), 'g'))]
      : [];
    assert.ok(
      serializableError.details && matches.length === 0,
      `${process.cwd()} is included in ${serializableError.details}`,
    );
  });

  void test('that error details do not contain file url path with user homedir', () => {
    const error = new ErrorWithDetailsAndCode(
      'test error',
      `${pathToFileURL(process.cwd()).toString()} test details`,
    );
    const serializableError = new SerializableError(error);
    const matches = serializableError.details
      ? [...serializableError.details.matchAll(new RegExp(os.homedir(), 'g'))]
      : [];
    assert.ok(
      serializableError.details && matches.length === 0,
      `${os.homedir()} is included in ${serializableError.details}`,
    );
  });

  void test('that error details do not contain file url path with current working directory', () => {
    const error = new ErrorWithDetailsAndCode(
      'test error',
      `${pathToFileURL(process.cwd()).toString()} test details`,
    );
    const serializableError = new SerializableError(error);
    const matches = serializableError.details
      ? [...serializableError.details.matchAll(new RegExp(process.cwd(), 'g'))]
      : [];
    assert.ok(
      serializableError.details && matches.length === 0,
      `${process.cwd()} is included in ${serializableError.details}`,
    );
  });

  void test('that error details do not contain AWS ARNs or stacks', () => {
    const error = new ErrorWithDetailsAndCode(
      'test error',
      // eslint-disable-next-line spellcheck/spell-checker
      'test error with stack: amplify-testapp-test-branch-1234abcd and arn: arn:aws-iso:service:region::res',
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(
      serializableError.details,
      'test error with stack: <escaped stack> and arn: <escaped ARN>',
    );
  });

  void test('that error details is sanitized by removing invalid characters', () => {
    const error = new ErrorWithDetailsAndCode(
      'test error',
      'some" er❌ror ""m"es❌sage❌',
    );
    const serializableError = new SerializableError(error);
    assert.deepStrictEqual(serializableError.details, 'some error message');
  });
});

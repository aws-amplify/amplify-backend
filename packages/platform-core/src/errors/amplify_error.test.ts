import { describe, it } from 'node:test';
import { AmplifyError, AmplifyUserError } from '.';
import assert from 'assert';
import * as util from 'util';

void describe('amplify error', () => {
  void it('serialize and deserialize correctly with AmplifyError cause', () => {
    const testError = new AmplifyUserError(
      'SyntaxError',
      {
        message: `"test" error ' message`,
        details: 'test error details',
        resolution: 'test resolution',
      },
      new AmplifyUserError('AccessDeniedError', {
        message: 'some downstream error message',
        resolution: 'test resolution',
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

  void it('serialize and deserialize correctly with generic Error cause', () => {
    const testError = new AmplifyUserError(
      'SyntaxError',
      {
        message: 'test error "message"',
        details: 'test error details',
        resolution: 'test resolution',
      },
      new Error('some generic error')
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

  void it('serialize and deserialize correctly with non-generic Error cause', () => {
    class TestError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'TestError';
      }
    }
    const testError = new AmplifyUserError(
      'SyntaxError',
      {
        message: 'test error "message"',
        details: 'test error details',
        resolution: 'test resolution',
      },
      new TestError('some test error')
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

  void it('deserialize when string is encoded with single quote and has double quotes in it', () => {
    const sampleStderr = `some random stderr
    ${util.inspect({
      serializedError:
        '{"name":"SyntaxError","classification":"ERROR","options":{"message":"test error message","resolution":"test resolution"}}',
    })}
and some after the error message
    `;
    const actual = AmplifyError.fromStderr(sampleStderr);
    assert.deepStrictEqual(actual?.name, 'SyntaxError');
    assert.deepStrictEqual(actual?.classification, 'ERROR');
    assert.deepStrictEqual(actual?.message, 'test error message');
    assert.deepStrictEqual(actual?.resolution, 'test resolution');
  });

  void it('deserialize when string is encoded with single quote and has double quotes escaped in between', () => {
    const sampleStderr = `some random stderr
    ${util.inspect({
      serializedError:
        '{"name":"SyntaxError","classification":"ERROR","options":{"message":"paths must start with \\"/\\" and end with \\"/*","resolution":"test resolution"}}',
    })}
and some after the error message
    `;
    const actual = AmplifyError.fromStderr(sampleStderr);
    assert.deepStrictEqual(actual?.name, 'SyntaxError');
    assert.deepStrictEqual(actual?.classification, 'ERROR');
    assert.deepStrictEqual(
      actual?.message,
      'paths must start with "/" and end with "/*'
    );
    assert.deepStrictEqual(actual?.resolution, 'test resolution');
  });

  void it('deserialize when string is encoded with double quote and has double quotes string in it', () => {
    const sampleStderr = `some random stderr
    serializedError: "{\\"name\\":\\"SyntaxError\\",\\"classification\\":\\"ERROR\\",\\"options\\":{\\"message\\":\\"test error message\\",\\"resolution\\":\\"test resolution\\"}}"
and some after the error message
    `;
    const actual = AmplifyError.fromStderr(sampleStderr);
    assert.deepStrictEqual(actual?.name, 'SyntaxError');
    assert.deepStrictEqual(actual?.classification, 'ERROR');
    assert.deepStrictEqual(actual?.message, 'test error message');
    assert.deepStrictEqual(actual?.resolution, 'test resolution');
  });

  void it('deserialize when string has single quotes in between', () => {
    const sampleStderr = `some random stderr
    ${util.inspect({
      serializedError:
        '{"name":"SyntaxError","classification":"ERROR","options":{"message":"Cannot read properties of undefined (reading \'data\')","resolution":"test resolution"}}',
    })}
and some after the error message
    `;
    const actual = AmplifyError.fromStderr(sampleStderr);
    assert.deepStrictEqual(actual?.name, 'SyntaxError');
    assert.deepStrictEqual(actual?.classification, 'ERROR');
    assert.deepStrictEqual(
      actual?.message,
      `Cannot read properties of undefined (reading 'data')`
    );
    assert.deepStrictEqual(actual?.resolution, 'test resolution');
  });
});

void describe('AmplifyError.fromError', async () => {
  void it('wraps Yargs validation errors in AmplifyUserError', () => {
    const yargsErrors = [
      new Error('Unknown command: asd'),
      new Error('Unknown arguments: a,b,c'),
      new Error('Missing required argument: d'),
      new Error('Did you mean sandbox'),
      new Error('Not enough non-option arguments: got 2, need at least 4'),
      new Error('Invalid values: Arguments: a, Given: n, Choices: [b, c, d]'),
      new Error('Arguments a and b are mutually exclusive'),
      new Error('Missing dependent arguments: branch -> appId'),
      new Error('Implications failed:\n app-id -> branch'),
    ];
    yargsErrors.forEach((error) => {
      const actual = AmplifyError.fromError(error);
      assert.ok(
        AmplifyError.isAmplifyError(actual) &&
          actual.name === 'InvalidCommandInputError',
        `Failed the test for error ${error.message}`
      );
    });
  });
  void it('wraps getaddrinfo ENOTFOUND errors in AmplifyUserError', () => {
    const error = new Error('getaddrinfo ENOTFOUND some-domain.com');
    const actual = AmplifyError.fromError(error);
    assert.ok(
      AmplifyError.isAmplifyError(actual) &&
        actual.name === 'DomainNotFoundError',
      `Failed the test for error ${error.message}`
    );
  });
  void it('wraps SyntaxErrors in AmplifyUserError', () => {
    const error = new Error('Typescript validation check failed.');
    error.name = 'SyntaxError';
    const actual = AmplifyError.fromError(error);
    assert.ok(
      AmplifyError.isAmplifyError(actual) && actual.name === 'SyntaxError',
      `Failed the test for error ${error.message}`
    );
  });
});

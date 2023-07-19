import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCallerDirectory } from './get_caller_directory.js';

describe('getCallerDirectory', () => {
  it('throws if stack trace is undefined', () => {
    assert.throws(() => getCallerDirectory(undefined));
  });

  it('throws if stack trace has less than two frames', () => {
    const tooShortStack = `Error
    at AmplifyAuthFactory (/Users/alias/sandboxes/install-test/node_modules/@aws-amplify/backend-auth/src/factory.ts:28:24)`;
    assert.throws(() => getCallerDirectory(tooShortStack));
  });

  it('throws if regex match not found', () => {
    const malformedStacktrace = `Error
    at AmplifyAuthFactory some garbage
    at more garbage
    at Object.<anonymous> (/Users/alias/sandboxes/install-test/backend/auth.ts:5:2)`;
    assert.throws(() => getCallerDirectory(malformedStacktrace));
  });

  it('returns path of second stack frame', () => {
    const validStackTrace = `Error
    at AmplifyAuthFactory (/Users/alias/sandboxes/install-test/node_modules/@aws-amplify/backend-auth/src/factory.ts:28:24)
    at <anonymous> (/Users/alias/sandboxes/install-test/backend/otherName.ts:3:21)
    at Object.<anonymous> (/Users/alias/sandboxes/install-test/backend/auth.ts:5:2)`;
    assert.strictEqual(
      getCallerDirectory(validStackTrace),
      '/Users/alias/sandboxes/install-test/backend'
    );
  });
});

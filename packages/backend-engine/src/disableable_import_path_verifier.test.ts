import { describe, it } from 'node:test';
import { EnvironmentBasedImportPathVerifier } from './disableable_import_path_verifier.js';
import assert from 'node:assert';

describe('DisableableImportPathVerifier', () => {
  const incorrectStackTrace = `Error
    at AmplifyAuthFactory (/Users/alias/sandboxes/install-test/node_modules/@aws-amplify/backend-auth/src/factory.ts:28:24)
    at <anonymous> (/Users/alias/sandboxes/install-test/backend/otherName.ts:3:21)
    at Object.<anonymous> (/Users/alias/sandboxes/install-test/backend/auth.ts:5:2)`;

  it('does nothing if disabled', () => {
    const verifier = new DisableableImportPathVerifier(false);
    assert.doesNotThrow(() =>
      verifier.verify(incorrectStackTrace, 'auth', 'test message')
    );
  });

  it('does nothing if importStack is undefined', () => {
    const verifier = new DisableableImportPathVerifier();
    assert.doesNotThrow(() =>
      verifier.verify(undefined, 'auth', 'test message')
    );
  });

  it('does nothing if importStack has fewer than 2 stacktrace lines', () => {
    const tooShortStack = `Error
    at AmplifyAuthFactory (/Users/alias/sandboxes/install-test/node_modules/@aws-amplify/backend-auth/src/factory.ts:28:24)`;

    const verifier = new DisableableImportPathVerifier();
    assert.doesNotThrow(() =>
      verifier.verify(tooShortStack, 'auth', 'test message')
    );
  });

  it('does nothing if importStack does not match file pattern regex', () => {
    const malformedStacktrace = `Error
    at AmplifyAuthFactory some garbage
    at more garbage
    at Object.<anonymous> (/Users/alias/sandboxes/install-test/backend/auth.ts:5:2)`;

    const verifier = new DisableableImportPathVerifier();
    assert.doesNotThrow(() =>
      verifier.verify(malformedStacktrace, 'auth', 'test message')
    );
  });

  it('throws expected error on incorrect import stack', () => {
    const verifier = new DisableableImportPathVerifier();
    assert.throws(
      () => verifier.verify(incorrectStackTrace, 'auth', 'test message'),
      new Error('test message')
    );
  });

  it('does nothing if import stack matches expected file name', () => {
    const correctStackTrace = `Error
    at AmplifyAuthFactory (/Users/alias/sandboxes/install-test/node_modules/@aws-amplify/backend-auth/src/factory.ts:28:24)
    at <anonymous> (/Users/alias/sandboxes/install-test/backend/auth.ts:3:21)
    at Object.<anonymous> (/Users/alias/sandboxes/install-test/backend/auth.ts:5:2)`;

    const verifier = new DisableableImportPathVerifier();
    assert.doesNotThrow(() =>
      verifier.verify(correctStackTrace, 'auth', 'test message')
    );
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ToggleableImportPathVerifier } from './toggleable_import_path_verifier.js';

void describe('ToggleableImportPathVerifier', () => {
  const incorrectStackTrace = `Error
    at AmplifyAuthFactory (/Users/alias/sandboxes/install-test/node_modules/@aws-amplify/backend-auth/src/factory.ts:28:24)
    at <anonymous> (/Users/alias/sandboxes/install-test/backend/otherName.ts:3:21)
    at Object.<anonymous> (/Users/alias/sandboxes/install-test/backend/auth.ts:5:2)`;

  void it('does nothing if disabled', () => {
    const verifier = new ToggleableImportPathVerifier(false);
    assert.doesNotThrow(() =>
      verifier.verify(incorrectStackTrace, 'auth', 'test message')
    );
  });

  void it('does nothing if importStack is undefined', () => {
    const verifier = new ToggleableImportPathVerifier();
    assert.doesNotThrow(() =>
      verifier.verify(undefined, 'auth', 'test message')
    );
  });

  void it('does nothing if importStack has fewer than 2 stacktrace lines', () => {
    const tooShortStack = `Error
    at AmplifyAuthFactory (/Users/alias/sandboxes/install-test/node_modules/@aws-amplify/backend-auth/src/factory.ts:28:24)`;

    const verifier = new ToggleableImportPathVerifier();
    assert.doesNotThrow(() =>
      verifier.verify(tooShortStack, 'auth', 'test message')
    );
  });

  void it('does nothing if importStack does not match file pattern regex', () => {
    const malformedStacktrace = `Error
    at AmplifyAuthFactory some garbage
    at more garbage
    at Object.<anonymous> (/Users/alias/sandboxes/install-test/backend/auth.ts:5:2)`;

    const verifier = new ToggleableImportPathVerifier();
    assert.doesNotThrow(() =>
      verifier.verify(malformedStacktrace, 'auth', 'test message')
    );
  });

  void it('throws expected error on incorrect import stack', () => {
    const verifier = new ToggleableImportPathVerifier();
    assert.throws(
      () => verifier.verify(incorrectStackTrace, 'auth', 'test message'),
      new Error('test message')
    );
  });

  void it('does nothing if import stack matches expected file name', () => {
    const correctStackTrace = `Error
    at AmplifyAuthFactory (/Users/alias/sandboxes/install-test/node_modules/@aws-amplify/backend-auth/src/factory.ts:28:24)
    at <anonymous> (/Users/alias/sandboxes/install-test/backend/auth.ts:3:21)
    at Object.<anonymous> (/Users/alias/sandboxes/install-test/backend/auth.ts:5:2)`;

    const verifier = new ToggleableImportPathVerifier();
    assert.doesNotThrow(() =>
      verifier.verify(correctStackTrace, 'auth', 'test message')
    );
  });
});

import { it } from 'node:test';
import assert from 'node:assert';
import { synthesizeStandaloneBackendTemplates } from '../define_backend_template_harness.js';
import { standaloneAuthAutoWebAuthn } from '../test-projects/standalone-auth-auto-webauthn/amplify/test_factories.js';

/**
 * In-memory integration test for standalone deployment with WebAuthn AUTO.
 *
 * Verifies that using webAuthn: true (AUTO relyingPartyId) throws an error
 * under standalone deployment context, since AUTO requires Amplify Hosting.
 */
void it('standalone deployment rejects WebAuthn AUTO relyingPartyId', () => {
  assert.throws(
    () => synthesizeStandaloneBackendTemplates(standaloneAuthAutoWebAuthn),
    (err: Error) => {
      // The original error is wrapped by AmplifyUserError; check the full chain
      const fullMessage = JSON.stringify(err, Object.getOwnPropertyNames(err));
      assert.ok(
        fullMessage.includes('AUTO'),
        `error chain should mention AUTO, got: ${fullMessage}`,
      );
      assert.ok(
        fullMessage.includes('standalone'),
        `error chain should mention standalone, got: ${fullMessage}`,
      );
      return true;
    },
  );
});

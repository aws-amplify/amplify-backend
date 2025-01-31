import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getSecret } from './seed_secret.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';

const testSecretName = 'testSecretName';

// getSecret() implements secretClient.getSecret() to pull the secret itself, see tests in packages/backend-secret to verify client.getSecret() works

void describe('getting secrets for seed', () => {
  void describe('set up for getting secret', () => {
    void it('throws AmplifyUserError if no backendId is set', async () => {
      const expectedErr = new AmplifyUserError(
        'SandboxIdentifierNotFoundError',
        {
          message: 'Sandbox Identifier is undefined',
          resolution:
            'Run npx ampx sandbox before re-running npx ampx sandbox seed',
        }
      );
      await assert.rejects(
        async () => await getSecret(testSecretName),
        expectedErr
      );
    });
  });
});

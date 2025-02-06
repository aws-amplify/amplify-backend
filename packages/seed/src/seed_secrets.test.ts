import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getSecret, setSecret } from './seed_secret.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';

// TO DO: come back to this after getting some advice about what should be tested for secrets

const testSecretName = 'testSecretName';
const testSecret = 'testSecret';

// getSecret() and setSecret() implement secretClient.getSecret()/secretClient.setSecret() to pull the secret itself,
// see tests in packages/backend-secret to verify getSecret()/setSecret() works

void describe('secrets APIs for seed', () => {
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

  void describe('set up for setting secret', () => {
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
        async () => await setSecret(testSecretName, testSecret),
        expectedErr
      );
    });
  });
});

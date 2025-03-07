import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SeedSecretClient, getSecret, setSecret } from './seed_secret.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  Secret,
  SecretClient,
  SecretIdentifier,
} from '@aws-amplify/backend-secret';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

const testBackendId = 'testBackendId';
const testSandboxName = 'testSandboxName';
const testSecretName = 'testSecretName';

const testBackendIdentifier: BackendIdentifier = {
  namespace: testBackendId,
  name: testSandboxName,
  type: 'sandbox',
};
const testSecretValue = 'testSecret';

void describe('secrets APIs for seed', () => {
  void describe('no backendId', () => {
    void it('getSecret throws AmplifyUserError if no backendId is set', async () => {
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

    void it('setSecret throws AmplifyUserError if no backendId is set', async () => {
      const expectedErr = new AmplifyUserError(
        'SandboxIdentifierNotFoundError',
        {
          message: 'Sandbox Identifier is undefined',
          resolution:
            'Run npx ampx sandbox before re-running npx ampx sandbox seed',
        }
      );
      await assert.rejects(
        async () => await setSecret(testSecretName, testSecretValue),
        expectedErr
      );
    });
  });

  void describe('getting/setting secrets', () => {
    const secretClientMock = {
      getSecret: mock.fn<
        (
          backendID: BackendIdentifier,
          secretId: SecretIdentifier
        ) => Promise<Secret>
      >(() =>
        Promise.resolve({
          name: testSecretName,
          value: testSecretValue,
        } as Secret)
      ),
      setSecret: mock.fn<
        (
          secretName: string,
          secretValue: string,
          backendID: BackendIdentifier
        ) => Promise<SecretIdentifier>
      >(() =>
        Promise.resolve({
          name: testSecretName,
        } as SecretIdentifier)
      ),
    };

    const seedSecretClient = new SeedSecretClient(
      secretClientMock as unknown as SecretClient
    );

    beforeEach(() => {
      secretClientMock.getSecret.mock.resetCalls();
      secretClientMock.setSecret.mock.resetCalls();
      process.env.AMPLIFY_BACKEND_IDENTIFIER = JSON.stringify(
        testBackendIdentifier
      );
    });

    afterEach(() => {
      delete process.env.AMPLIFY_BACKEND_IDENTIFIER;
    });

    void it('getSecret properly calls getSecret from secretClientWithAmplifyErrorHandling', async () => {
      const secretVal = await seedSecretClient.getSecret(testSecretName);

      assert.strictEqual(secretClientMock.getSecret.mock.callCount(), 1);
      assert.strictEqual(secretVal, testSecretValue);
    });

    void it('setSecret properly calls setSecret from secretClientWithAmplifyErrorHandling', async () => {
      const secretName = await seedSecretClient.setSecret(
        testSecretName,
        testSecretValue
      );

      assert.strictEqual(secretClientMock.setSecret.mock.callCount(), 1);
      assert.strictEqual(secretName, testSecretName);
    });
  });
});

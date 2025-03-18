import { AmplifyUserError } from '@aws-amplify/platform-core';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ConfigReader } from './config_reader.js';
import { generateClientConfig } from '@aws-amplify/client-config';
import { AWSAmplifyBackendOutputs } from '../../../client-config/src/client-config-schema/client_config_v1.3.js';

const testBackendId = 'testBackendId';
const testSandboxName = 'testSandboxName';

const testBackendIdentifier: BackendIdentifier = {
  namespace: testBackendId,
  name: testSandboxName,
  type: 'sandbox',
};

const testUserpoolId = 'us-east-1_userpoolTest';
const testUserpoolClient = 'userPoolClientId';
const testRegion = 'us-east-1';
const testMfaMethods = ['SMS', 'TOTP'];
const testMfaConfig = 'OPTIONAL';
const testGroups = ['ADMIN'];

void describe('reading client configuration', () => {
  void describe('backendId exists', () => {
    const mockConfigGenerator = mock.fn(async () =>
      Promise.resolve({
        version: '1.3',
        storage: {
          aws_region: testRegion,
          bucket_name: 'my-cool-bucket',
        },
      } as AWSAmplifyBackendOutputs),
    );

    const configReader = new ConfigReader(
      mockConfigGenerator as unknown as typeof generateClientConfig,
    );

    beforeEach(() => {
      process.env.AMPLIFY_BACKEND_IDENTIFIER = JSON.stringify(
        testBackendIdentifier,
      );
      mockConfigGenerator.mock.resetCalls();
    });

    afterEach(() => {
      delete process.env.AMPLIFY_BACKEND_IDENTIFIER;
    });

    void it('successfully reads client config if auth exists', async () => {
      mockConfigGenerator.mock.mockImplementationOnce(async () =>
        Promise.resolve({
          version: '1.3',
          auth: {
            aws_region: testRegion,
            user_pool_id: testUserpoolId,
            user_pool_client_id: testUserpoolClient,
            mfa_methods: testMfaMethods,
            mfa_configuration: testMfaConfig,
            groups: [{ ADMIN: { precedence: 1 } }],
          },
        } as AWSAmplifyBackendOutputs),
      );

      const output = await configReader.getAuthConfig();

      assert.strictEqual(output.userPoolId, testUserpoolId);
      assert.strictEqual(output.mfaMethods, testMfaMethods);
      assert.strictEqual(output.mfaConfig, testMfaConfig);
      assert.deepStrictEqual(output.groups, testGroups);
    });

    void it('throws error if auth construct does not exist', async () => {
      const expectedErr = new AmplifyUserError('MissingAuthError', {
        message:
          'Outputs for Auth are missing, you may be missing an Auth resource',
        resolution:
          'Create an Auth resource for your Amplify App or run ampx sandbox if you have generated your sandbox',
      });

      await assert.rejects(
        async () => await configReader.getAuthConfig(),
        expectedErr,
      );
    });
  });
  void describe('backendId does not exist', () => {
    void it('throws error if no backendId is provided', async () => {
      const expectedErr = new AmplifyUserError(
        'SandboxIdentifierNotFoundError',
        {
          message: 'Sandbox Identifier is undefined',
          resolution:
            'Run ampx sandbox before re-running ampx sandbox seed. If you are running the seed script directly through tsx seed.ts, try running it with ampx sandbox seed instead',
        },
      );
      const configReader = new ConfigReader();

      await assert.rejects(
        async () => await configReader.getAuthConfig(),
        expectedErr,
      );
    });
  });
});

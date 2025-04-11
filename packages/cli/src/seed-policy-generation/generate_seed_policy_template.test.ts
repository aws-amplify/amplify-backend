import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { AWSAmplifyBackendOutputs } from '../../../client-config/src/client-config-schema/client_config_v1.4.js';
import { generateSeedPolicyTemplate } from './generate_seed_policy_template.js';
import { generateClientConfig } from '@aws-amplify/client-config';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { App, Stack } from 'aws-cdk-lib';
import { AccountPrincipal, Policy, Role } from 'aws-cdk-lib/aws-iam';
import { Template } from 'aws-cdk-lib/assertions';
import {
  GetCallerIdentityCommandInput,
  GetCallerIdentityCommandOutput,
  STSClient,
} from '@aws-sdk/client-sts';

const testBackendId = 'testBackendId';
const testSandboxName = 'testSandboxName';
const testBackendHash = '12345abcde';
const testUserpoolId = 'us-east-1_userpoolTest';
const testUserpoolClient = 'userPoolClientId';
const testRegion = 'us-east-1';
const testArn =
  'arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_userpoolTest';

const testBackendIdentifier: BackendIdentifier = {
  namespace: testBackendId,
  name: testSandboxName,
  type: 'sandbox',
  hash: testBackendHash,
};

void describe('generate inline policy for seed', () => {
  const mockConfigGenerator = mock.fn(async () =>
    Promise.resolve({
      version: '1.4',
      auth: {
        aws_region: testRegion,
        user_pool_id: testUserpoolId,
        user_pool_client_id: testUserpoolClient,
      },
    } as AWSAmplifyBackendOutputs),
  );

  const mockStsClient = {
    send: mock.fn<
      (
        input: GetCallerIdentityCommandInput,
      ) => Promise<GetCallerIdentityCommandOutput>
    >(async () =>
      Promise.resolve({
        Account: '123456789012',
        Arn: '',
        UserId: '',
      } as GetCallerIdentityCommandOutput),
    ),
  };

  const app = new App();
  const stack = new Stack(app);

  beforeEach(() => {
    mockConfigGenerator.mock.resetCalls();
    mockStsClient.send.mock.resetCalls();
  });

  void it('returns a policy with expected seed permissions', async () => {
    const policyDoc = await generateSeedPolicyTemplate(
      testBackendIdentifier,
      mockConfigGenerator as unknown as typeof generateClientConfig,
      mockStsClient as unknown as STSClient,
    );

    const policy = new Policy(stack, 'testSeedPolicy', { document: policyDoc });
    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'cognito-idp:AdminCreateUser',
              'cognito-idp:AdminAddUserToGroup',
            ],
            Effect: 'Allow',
            Resource: testArn,
          },
          {
            Action: ['ssm:PutParameter', 'ssm:GetParameter'],
            Effect: 'Allow',
            Resource: [
              `arn:aws:ssm:*:*:parameter/amplify/${testBackendId}/${testSandboxName}-sandbox-${testBackendHash}/*`,
              `arn:aws:ssm:*:*:parameter/amplify/shared/${testBackendId}/*`,
            ],
          },
        ],
      },
    });
  });

  void it('throws error if there is no userpool attached to sandbox', async () => {
    mockConfigGenerator.mock.mockImplementationOnce(async () =>
      Promise.resolve({
        version: '1.4',
        storage: {
          aws_region: testRegion,
          bucket_name: 'my-cool-bucket',
        },
      } as AWSAmplifyBackendOutputs),
    );

    const expectedErr = new AmplifyUserError('MissingAuthError', {
      message: 'There is no auth resource in this sandbox',
      resolution:
        'Please add an auth resource to your sandbox and rerun this command',
    });

    await assert.rejects(
      async () =>
        generateSeedPolicyTemplate(
          testBackendIdentifier,
          mockConfigGenerator as unknown as typeof generateClientConfig,
        ),
      (err: AmplifyUserError) => {
        assert.strictEqual(err.name, expectedErr.name);
        assert.strictEqual(err.message, expectedErr.message);
        assert.strictEqual(err.resolution, expectedErr.resolution);
        return true;
      },
    );
  });
});

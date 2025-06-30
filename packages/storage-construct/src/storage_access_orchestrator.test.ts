/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, it, mock } from 'node:test';
import { StorageAccessOrchestrator } from './storage_access_orchestrator.js';
import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import assert from 'node:assert';
import { entityIdPathToken, entityIdSubstitution } from './constants.js';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';

void describe('StorageAccessOrchestrator', () => {
  void describe('orchestrateStorageAccess', () => {
    let stack: Stack;
    let bucket: Bucket;
    let storageAccessPolicyFactory: StorageAccessPolicyFactory;
    let authRole: Role;
    let unauthRole: Role;

    beforeEach(() => {
      stack = createStackAndSetContext();
      bucket = new Bucket(stack, 'testBucket');
      storageAccessPolicyFactory = new StorageAccessPolicyFactory(bucket);

      authRole = new Role(stack, 'AuthRole', {
        assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
      });
      unauthRole = new Role(stack, 'UnauthRole', {
        assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
      });
    });

    void it('throws if access prefixes are invalid', () => {
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      assert.throws(
        () =>
          storageAccessOrchestrator.orchestrateStorageAccess({
            'test/prefix': [
              {
                // Invalid: missing /*
                role: authRole,
                actions: ['get', 'write'],
                idSubstitution: '*',
              },
            ],
          } as any),
        { message: /must end with/ },
      );
    });

    void it('passes expected policy to role', () => {
      const attachInlinePolicyMock = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        'test/prefix/*': [
          {
            role: authRole,
            actions: ['get', 'write'],
            idSubstitution: '*',
          },
        ],
      });

      assert.equal(attachInlinePolicyMock.mock.callCount(), 1);
      const policy = attachInlinePolicyMock.mock.calls[0].arguments[0];
      assert.deepStrictEqual(policy.document.toJSON(), {
        Statement: [
          {
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/test/prefix/*`,
          },
          {
            Action: 's3:PutObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/test/prefix/*`,
          },
        ],
        Version: '2012-10-17',
      });
    });

    void it('handles multiple permissions for the same role', () => {
      const attachInlinePolicyMock = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        'test/prefix/*': [
          {
            role: authRole,
            actions: ['get', 'write', 'delete'],
            idSubstitution: '*',
          },
        ],
        'another/prefix/*': [
          {
            role: authRole,
            actions: ['get'],
            idSubstitution: '*',
          },
        ],
      });

      assert.equal(attachInlinePolicyMock.mock.callCount(), 1);
      const policy = attachInlinePolicyMock.mock.calls[0].arguments[0];
      assert.deepStrictEqual(policy.document.toJSON(), {
        Statement: [
          {
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: [
              `${bucket.bucketArn}/test/prefix/*`,
              `${bucket.bucketArn}/another/prefix/*`,
            ],
          },
          {
            Action: 's3:PutObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/test/prefix/*`,
          },
          {
            Action: 's3:DeleteObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/test/prefix/*`,
          },
        ],
        Version: '2012-10-17',
      });
    });

    void it('handles multiple roles', () => {
      const attachInlinePolicyMockAuth = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const attachInlinePolicyMockUnauth = mock.method(
        unauthRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        'test/prefix/*': [
          {
            role: authRole,
            actions: ['get', 'write', 'delete'],
            idSubstitution: '*',
          },
          {
            role: unauthRole,
            actions: ['get'],
            idSubstitution: '*',
          },
        ],
        'another/prefix/*': [
          {
            role: unauthRole,
            actions: ['get', 'delete'],
            idSubstitution: '*',
          },
        ],
      });

      assert.equal(attachInlinePolicyMockAuth.mock.callCount(), 1);
      assert.equal(attachInlinePolicyMockUnauth.mock.callCount(), 1);

      const authPolicy = attachInlinePolicyMockAuth.mock.calls[0].arguments[0];
      assert.deepStrictEqual(authPolicy.document.toJSON(), {
        Statement: [
          {
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/test/prefix/*`,
          },
          {
            Action: 's3:PutObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/test/prefix/*`,
          },
          {
            Action: 's3:DeleteObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/test/prefix/*`,
          },
        ],
        Version: '2012-10-17',
      });

      const unauthPolicy =
        attachInlinePolicyMockUnauth.mock.calls[0].arguments[0];
      assert.deepStrictEqual(unauthPolicy.document.toJSON(), {
        Statement: [
          {
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: [
              `${bucket.bucketArn}/test/prefix/*`,
              `${bucket.bucketArn}/another/prefix/*`,
            ],
          },
          {
            Action: 's3:DeleteObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/another/prefix/*`,
          },
        ],
        Version: '2012-10-17',
      });
    });

    void it('replaces owner placeholder in s3 prefix', () => {
      const attachInlinePolicyMock = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        [`test/${entityIdPathToken}/*`]: [
          {
            role: authRole,
            actions: ['get', 'write'],
            idSubstitution: entityIdSubstitution,
          },
        ],
      });

      assert.equal(attachInlinePolicyMock.mock.callCount(), 1);
      const policy = attachInlinePolicyMock.mock.calls[0].arguments[0];
      assert.deepStrictEqual(policy.document.toJSON(), {
        Statement: [
          {
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/test/${entityIdSubstitution}/*`,
          },
          {
            Action: 's3:PutObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/test/${entityIdSubstitution}/*`,
          },
        ],
        Version: '2012-10-17',
      });
    });

    void it('denies parent actions on a subpath by default', () => {
      const attachInlinePolicyMockAuth = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const attachInlinePolicyMockUnauth = mock.method(
        unauthRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        'foo/*': [
          {
            role: authRole,
            actions: ['get', 'write'],
            idSubstitution: '*',
          },
        ],
        'foo/bar/*': [
          {
            role: unauthRole,
            actions: ['get'],
            idSubstitution: '*',
          },
        ],
      });

      assert.equal(attachInlinePolicyMockAuth.mock.callCount(), 1);
      const authPolicy = attachInlinePolicyMockAuth.mock.calls[0].arguments[0];
      assert.deepStrictEqual(authPolicy.document.toJSON(), {
        Statement: [
          {
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/foo/*`,
          },
          {
            Action: 's3:GetObject',
            Effect: 'Deny',
            Resource: `${bucket.bucketArn}/foo/bar/*`,
          },
          {
            Action: 's3:PutObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/foo/*`,
          },
          {
            Action: 's3:PutObject',
            Effect: 'Deny',
            Resource: `${bucket.bucketArn}/foo/bar/*`,
          },
        ],
        Version: '2012-10-17',
      });

      assert.equal(attachInlinePolicyMockUnauth.mock.callCount(), 1);
      const unauthPolicy =
        attachInlinePolicyMockUnauth.mock.calls[0].arguments[0];
      assert.deepStrictEqual(unauthPolicy.document.toJSON(), {
        Statement: [
          {
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/foo/bar/*`,
          },
        ],
        Version: '2012-10-17',
      });
    });

    void it('replaces "read" access with "get" and "list"', () => {
      const attachInlinePolicyMock = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        'foo/bar/*': [
          {
            role: authRole,
            actions: ['read'],
            idSubstitution: '*',
          },
        ],
      });

      assert.equal(attachInlinePolicyMock.mock.callCount(), 1);
      const policy = attachInlinePolicyMock.mock.calls[0].arguments[0];
      assert.deepStrictEqual(policy.document.toJSON(), {
        Statement: [
          {
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: `${bucket.bucketArn}/foo/bar/*`,
          },
          {
            Action: 's3:ListBucket',
            Effect: 'Allow',
            Resource: bucket.bucketArn,
            Condition: {
              StringLike: {
                's3:prefix': ['foo/bar/*', 'foo/bar/'],
              },
            },
          },
        ],
        Version: '2012-10-17',
      });
    });
  });
});

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

import { beforeEach, describe, it, mock } from 'node:test';
import { StorageAccessOrchestrator } from './storage_access_orchestrator.js';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
  ImportPathVerifier,
} from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import assert from 'node:assert';
import { ownerPathPartToken } from './constants.js';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';

void describe('StorageAccessOrchestrator', () => {
  void describe('orchestrateStorageAccess', () => {
    let stack: Stack;
    let constructContainer: ConstructContainer;
    let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
    let importPathVerifier: ImportPathVerifier;
    let getInstanceProps: ConstructFactoryGetInstanceProps;
    let bucket: Bucket;
    let storageAccessPolicyFactory: StorageAccessPolicyFactory;

    const ssmEnvironmentEntriesStub = [
      { name: 'TEST_BUCKET_NAME', path: 'test/ssm/path/to/bucket/name' },
    ];

    beforeEach(() => {
      stack = createStackAndSetContext();

      constructContainer = new ConstructContainerStub(
        new StackResolverStub(stack)
      );

      outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
        stack
      );

      importPathVerifier = new ImportPathVerifierStub();

      getInstanceProps = {
        constructContainer,
        outputStorageStrategy,
        importPathVerifier,
      };

      bucket = new Bucket(stack, 'testBucket');

      storageAccessPolicyFactory = new StorageAccessPolicyFactory(bucket);
    });
    void it('throws if access prefixes are invalid', () => {
      const acceptResourceAccessMock = mock.fn();
      const storageAccessPolicyArbiter = new StorageAccessOrchestrator(
        () => ({
          '/test/prefix/*': [
            {
              actions: ['read', 'write'],
              getResourceAccessAcceptor: () => ({
                identifier: 'testResourceAccessAcceptor',
                acceptResourceAccess: acceptResourceAccessMock,
              }),
              ownerPlaceholderSubstitution: '*',
            },
          ],
        }),
        getInstanceProps,
        ssmEnvironmentEntriesStub,
        storageAccessPolicyFactory,
        () => {
          throw new Error('test validation error');
        }
      );

      assert.throws(
        () => storageAccessPolicyArbiter.orchestrateStorageAccess(),
        { message: 'test validation error' }
      );
    });

    void it('passes expected policy and ssm context to resource access acceptor', () => {
      const acceptResourceAccessMock = mock.fn();
      const storageAccessPolicyArbiter = new StorageAccessOrchestrator(
        () => ({
          '/test/prefix/*': [
            {
              actions: ['read', 'write'],
              getResourceAccessAcceptor: () => ({
                identifier: 'testResourceAccessAcceptor',
                acceptResourceAccess: acceptResourceAccessMock,
              }),
              ownerPlaceholderSubstitution: '*',
            },
          ],
        }),
        getInstanceProps,
        ssmEnvironmentEntriesStub,
        storageAccessPolicyFactory
      );

      storageAccessPolicyArbiter.orchestrateStorageAccess();
      assert.equal(acceptResourceAccessMock.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[0].document.toJSON(),
        {
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
        }
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[1],
        [{ name: 'TEST_BUCKET_NAME', path: 'test/ssm/path/to/bucket/name' }]
      );
    });

    void it('handles multiple permissions for the same resource access acceptor', () => {
      const acceptResourceAccessMock = mock.fn();
      const getResourceAccessAcceptorStub = () => ({
        identifier: 'testResourceAccessAcceptor',
        acceptResourceAccess: acceptResourceAccessMock,
      });
      const storageAccessPolicyArbiter = new StorageAccessOrchestrator(
        () => ({
          '/test/prefix/*': [
            {
              actions: ['read', 'write', 'delete'],
              getResourceAccessAcceptor: getResourceAccessAcceptorStub,
              ownerPlaceholderSubstitution: '*',
            },
          ],
          '/another/prefix/*': [
            {
              actions: ['read'],
              getResourceAccessAcceptor: getResourceAccessAcceptorStub,
              ownerPlaceholderSubstitution: '*',
            },
          ],
        }),
        getInstanceProps,
        ssmEnvironmentEntriesStub,
        storageAccessPolicyFactory
      );

      storageAccessPolicyArbiter.orchestrateStorageAccess();
      assert.equal(acceptResourceAccessMock.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[0].document.toJSON(),
        {
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
        }
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[1],
        [{ name: 'TEST_BUCKET_NAME', path: 'test/ssm/path/to/bucket/name' }]
      );
    });

    void it('handles multiple resource access acceptors', () => {
      const acceptResourceAccessMock1 = mock.fn();
      const getResourceAccessAcceptorStub1 = () => ({
        identifier: 'testResourceAccessAcceptor1',
        acceptResourceAccess: acceptResourceAccessMock1,
      });
      const acceptResourceAccessMock2 = mock.fn();
      const getResourceAccessAcceptorStub2 = () => ({
        identifier: 'testResourceAccessAcceptor2',
        acceptResourceAccess: acceptResourceAccessMock2,
      });
      const storageAccessPolicyArbiter = new StorageAccessOrchestrator(
        () => ({
          '/test/prefix/*': [
            {
              actions: ['read', 'write', 'delete'],
              getResourceAccessAcceptor: getResourceAccessAcceptorStub1,
              ownerPlaceholderSubstitution: '*',
            },
            {
              actions: ['read'],
              getResourceAccessAcceptor: getResourceAccessAcceptorStub2,
              ownerPlaceholderSubstitution: '*',
            },
          ],
          '/another/prefix/*': [
            {
              actions: ['read', 'delete'],
              getResourceAccessAcceptor: getResourceAccessAcceptorStub2,
              ownerPlaceholderSubstitution: '*',
            },
          ],
        }),
        getInstanceProps,
        ssmEnvironmentEntriesStub,
        storageAccessPolicyFactory
      );

      storageAccessPolicyArbiter.orchestrateStorageAccess();
      assert.equal(acceptResourceAccessMock1.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock1.mock.calls[0].arguments[0].document.toJSON(),
        {
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
        }
      );
      assert.equal(acceptResourceAccessMock2.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock2.mock.calls[0].arguments[0].document.toJSON(),
        {
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
        }
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock1.mock.calls[0].arguments[1],
        [{ name: 'TEST_BUCKET_NAME', path: 'test/ssm/path/to/bucket/name' }]
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock2.mock.calls[0].arguments[1],
        [{ name: 'TEST_BUCKET_NAME', path: 'test/ssm/path/to/bucket/name' }]
      );
    });

    void it('replaces owner placeholder in s3 prefix', () => {
      const acceptResourceAccessMock = mock.fn();
      const storageAccessPolicyArbiter = new StorageAccessOrchestrator(
        () => ({
          [`/test/${ownerPathPartToken}/*`]: [
            {
              actions: ['read', 'write'],
              getResourceAccessAcceptor: () => ({
                identifier: 'testResourceAccessAcceptor',
                acceptResourceAccess: acceptResourceAccessMock,
              }),
              ownerPlaceholderSubstitution: '{testOwnerSub}',
            },
          ],
        }),
        getInstanceProps,
        ssmEnvironmentEntriesStub,
        storageAccessPolicyFactory
      );

      storageAccessPolicyArbiter.orchestrateStorageAccess();
      assert.equal(acceptResourceAccessMock.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/test/{testOwnerSub}/*`,
            },
            {
              Action: 's3:PutObject',
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/test/{testOwnerSub}/*`,
            },
          ],
          Version: '2012-10-17',
        }
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[1],
        [{ name: 'TEST_BUCKET_NAME', path: 'test/ssm/path/to/bucket/name' }]
      );
    });

    void it('denies parent actions on a subpath by default', () => {
      const acceptResourceAccessMock1 = mock.fn();
      const acceptResourceAccessMock2 = mock.fn();
      const storageAccessPolicyArbiter = new StorageAccessOrchestrator(
        () => ({
          '/foo/*': [
            {
              actions: ['read', 'write'],
              getResourceAccessAcceptor: () => ({
                identifier: 'resourceAccessAcceptor1',
                acceptResourceAccess: acceptResourceAccessMock1,
              }),
              ownerPlaceholderSubstitution: '*',
            },
          ],
          '/foo/bar/*': [
            {
              actions: ['read'],
              getResourceAccessAcceptor: () => ({
                identifier: 'resourceAccessAcceptor2',
                acceptResourceAccess: acceptResourceAccessMock2,
              }),
              ownerPlaceholderSubstitution: '*',
            },
          ],
        }),
        getInstanceProps,
        ssmEnvironmentEntriesStub,
        storageAccessPolicyFactory
      );

      storageAccessPolicyArbiter.orchestrateStorageAccess();
      assert.equal(acceptResourceAccessMock1.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock1.mock.calls[0].arguments[0].document.toJSON(),
        {
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
        }
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock1.mock.calls[0].arguments[1],
        [{ name: 'TEST_BUCKET_NAME', path: 'test/ssm/path/to/bucket/name' }]
      );

      assert.equal(acceptResourceAccessMock2.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock2.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/foo/bar/*`,
            },
          ],
          Version: '2012-10-17',
        }
      );
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

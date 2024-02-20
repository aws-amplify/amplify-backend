import { beforeEach, describe, it, mock } from 'node:test';
import { StorageAccessPolicyArbiter } from './storage_access_policy_arbiter.js';
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
  SsmEnvironmentEntriesGenerator,
} from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import assert from 'node:assert';

void describe('StorageAccessPolicyArbiter', () => {
  void describe('arbitratePolicies', () => {
    let stack: Stack;
    let constructContainer: ConstructContainer;
    let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
    let importPathVerifier: ImportPathVerifier;
    let getInstanceProps: ConstructFactoryGetInstanceProps;

    const ssmEnvironmentEntriesGeneratorStub: SsmEnvironmentEntriesGenerator = {
      generateSsmEnvironmentEntries: mock.fn(() => [
        { name: 'TEST_BUCKET_NAME', path: 'test/ssm/path/to/bucket/name' },
      ]),
    };

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
    });
    void it('passes expected policy and ssm context to resource access acceptor', () => {
      const bucket = new Bucket(stack, 'testBucket');
      const acceptResourceAccessMock = mock.fn();
      const storageAccessPolicyArbiter = new StorageAccessPolicyArbiter(
        'testName',
        {
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
        },
        ssmEnvironmentEntriesGeneratorStub,
        getInstanceProps,
        bucket
      );

      storageAccessPolicyArbiter.arbitratePolicies();
      assert.equal(acceptResourceAccessMock.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: ['s3:GetObject', 's3:PutObject'],
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
      const bucket = new Bucket(stack, 'testBucket');
      const acceptResourceAccessMock = mock.fn();
      const getResourceAccessAcceptorStub = () => ({
        identifier: 'testResourceAccessAcceptor',
        acceptResourceAccess: acceptResourceAccessMock,
      });
      const storageAccessPolicyArbiter = new StorageAccessPolicyArbiter(
        'testName',
        {
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
        },
        ssmEnvironmentEntriesGeneratorStub,
        getInstanceProps,
        bucket
      );

      storageAccessPolicyArbiter.arbitratePolicies();
      assert.equal(acceptResourceAccessMock.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/test/prefix/*`,
            },
            {
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/another/prefix/*`,
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
      const bucket = new Bucket(stack, 'testBucket');
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
      const storageAccessPolicyArbiter = new StorageAccessPolicyArbiter(
        'testName',
        {
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
        },
        ssmEnvironmentEntriesGeneratorStub,
        getInstanceProps,
        bucket
      );

      storageAccessPolicyArbiter.arbitratePolicies();
      assert.equal(acceptResourceAccessMock1.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock1.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
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
              Resource: `${bucket.bucketArn}/test/prefix/*`,
            },
            {
              Action: ['s3:GetObject', 's3:DeleteObject'],
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
      const bucket = new Bucket(stack, 'testBucket');
      const acceptResourceAccessMock = mock.fn();
      const storageAccessPolicyArbiter = new StorageAccessPolicyArbiter(
        'testName',
        {
          '/test/{owner}/*': [
            {
              actions: ['read', 'write'],
              getResourceAccessAcceptor: () => ({
                identifier: 'testResourceAccessAcceptor',
                acceptResourceAccess: acceptResourceAccessMock,
              }),
              ownerPlaceholderSubstitution: '{testOwnerSub}',
            },
          ],
        },
        ssmEnvironmentEntriesGeneratorStub,
        getInstanceProps,
        bucket
      );

      storageAccessPolicyArbiter.arbitratePolicies();
      assert.equal(acceptResourceAccessMock.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: ['s3:GetObject', 's3:PutObject'],
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

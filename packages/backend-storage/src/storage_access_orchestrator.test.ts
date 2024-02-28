import { beforeEach, describe, it, mock } from 'node:test';
import { StorageAccessOrchestrator } from './storage_access_orchestrator.js';
import { ConstructFactoryGetInstanceProps } from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import assert from 'node:assert';
import { ownerPathPartToken } from './constants.js';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';

void describe('StorageAccessOrchestrator', () => {
  void describe('orchestrateStorageAccess', () => {
    let stack: Stack;
    let bucket: Bucket;
    let storageAccessPolicyFactory: StorageAccessPolicyFactory;

    const ssmEnvironmentEntriesStub = [
      { name: 'TEST_BUCKET_NAME', path: 'test/ssm/path/to/bucket/name' },
    ];

    beforeEach(() => {
      stack = createStackAndSetContext();

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
        {} as unknown as ConstructFactoryGetInstanceProps,
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
        {} as unknown as ConstructFactoryGetInstanceProps,
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
        ssmEnvironmentEntriesStub
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
        {} as unknown as ConstructFactoryGetInstanceProps,
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
        ssmEnvironmentEntriesStub
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
        {} as unknown as ConstructFactoryGetInstanceProps,
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
        ssmEnvironmentEntriesStub
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock2.mock.calls[0].arguments[1],
        ssmEnvironmentEntriesStub
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
        {} as unknown as ConstructFactoryGetInstanceProps,
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
        ssmEnvironmentEntriesStub
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
        {} as unknown as ConstructFactoryGetInstanceProps,
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
        ssmEnvironmentEntriesStub
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

    void it('combines owner rules for same resource access acceptor', () => {
      const acceptResourceAccessMock = mock.fn();
      const authenticatedResourceAccessAcceptor = () => ({
        identifier: 'authenticatedResourceAccessAcceptor',
        acceptResourceAccess: acceptResourceAccessMock,
      });

      const storageAccessPolicyArbiter = new StorageAccessOrchestrator(
        () => ({
          '/foo/{owner}/*': [
            {
              actions: ['write', 'delete'],
              getResourceAccessAcceptor: authenticatedResourceAccessAcceptor,
              ownerPlaceholderSubstitution: '{ownerSub}',
            },
            {
              actions: ['read'],
              getResourceAccessAcceptor: authenticatedResourceAccessAcceptor,
              ownerPlaceholderSubstitution: '*',
            },
          ],
        }),
        {} as unknown as ConstructFactoryGetInstanceProps,
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
              Action: 's3:PutObject',
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/foo/{ownerSub}/*`,
            },
            {
              Action: 's3:DeleteObject',
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/foo/{ownerSub}/*`,
            },
            {
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/foo/*/*`,
            },
          ],
          Version: '2012-10-17',
        }
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[1],
        ssmEnvironmentEntriesStub
      );
    });

    void it('handles multiple resource access acceptors on multiple prefixes', () => {
      const acceptResourceAccessMock1 = mock.fn();
      const acceptResourceAccessMock2 = mock.fn();
      const getResourceAccessAcceptorStub1 = () => ({
        identifier: 'resourceAccessAcceptor1',
        acceptResourceAccess: acceptResourceAccessMock1,
      });
      const getResourceAccessAcceptorStub2 = () => ({
        identifier: 'resourceAccessAcceptor2',
        acceptResourceAccess: acceptResourceAccessMock2,
      });

      const storageAccessPolicyArbiter = new StorageAccessOrchestrator(
        () => ({
          // acceptor1 should have read write on this path
          // acceptor2 should not have any rules for this path
          '/foo/*': [
            {
              actions: ['read', 'write'],
              getResourceAccessAcceptor: getResourceAccessAcceptorStub1,
              ownerPlaceholderSubstitution: '*',
            },
          ],
          // acceptor1 should be denied read and write on this path
          // acceptor2 should have only read on this path
          '/foo/bar/*': [
            {
              actions: ['read'],
              getResourceAccessAcceptor: getResourceAccessAcceptorStub2,
              ownerPlaceholderSubstitution: '{ownerSub}',
            },
          ],
          // acceptor1 should be denied write on this path (read from parent path covers read on this path)
          // acceptor2 should not have any rules for this path
          '/foo/baz/*': [
            {
              actions: ['read'],
              ownerPlaceholderSubstitution: '*',
              getResourceAccessAcceptor: getResourceAccessAcceptorStub1,
            },
          ],
          // acceptor 1 is denied write on this path (read still allowed)
          // acceptor 2 has read/write/delete on path with ownerSub
          '/other/{owner}/*': [
            {
              actions: ['read', 'write', 'delete'],
              getResourceAccessAcceptor: getResourceAccessAcceptorStub2,
              ownerPlaceholderSubstitution: '{ownerSub}',
            },
            {
              actions: ['read'],
              getResourceAccessAcceptor: getResourceAccessAcceptorStub1,
              ownerPlaceholderSubstitution: '*',
            },
          ],
        }),
        {} as unknown as ConstructFactoryGetInstanceProps,
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
              Resource: [
                `${bucket.bucketArn}/foo/*`,
                `${bucket.bucketArn}/other/*/*`,
              ],
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
              Resource: [
                `${bucket.bucketArn}/foo/bar/*`,
                `${bucket.bucketArn}/foo/baz/*`,
              ],
            },
          ],
          Version: '2012-10-17',
        }
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock1.mock.calls[0].arguments[1],
        ssmEnvironmentEntriesStub
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
                `${bucket.bucketArn}/foo/bar/*`,
                `${bucket.bucketArn}/other/{ownerSub}/*`,
              ],
            },
            {
              Action: 's3:PutObject',
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/other/{ownerSub}/*`,
            },
            {
              Action: 's3:DeleteObject',
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/other/{ownerSub}/*`,
            },
          ],
          Version: '2012-10-17',
        }
      );
    });

    void it('combines actions from multiple rules on the same resource access acceptor', () => {
      const acceptResourceAccessMock = mock.fn();
      const authenticatedResourceAccessAcceptor = () => ({
        identifier: 'authenticatedResourceAccessAcceptor',
        acceptResourceAccess: acceptResourceAccessMock,
      });

      const storageAccessPolicyArbiter = new StorageAccessOrchestrator(
        () => ({
          '/foo/*': [
            {
              actions: ['read'],
              getResourceAccessAcceptor: authenticatedResourceAccessAcceptor,
              ownerPlaceholderSubstitution: '*',
            },
            {
              actions: ['write'],
              getResourceAccessAcceptor: authenticatedResourceAccessAcceptor,
              ownerPlaceholderSubstitution: '{ownerSub}',
            },
            {
              actions: ['delete'],
              getResourceAccessAcceptor: authenticatedResourceAccessAcceptor,
              ownerPlaceholderSubstitution: '*',
            },
          ],
        }),
        {} as unknown as ConstructFactoryGetInstanceProps,
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
              Resource: `${bucket.bucketArn}/foo/*`,
            },
            {
              Action: 's3:PutObject',
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/foo/*`,
            },
            {
              Action: 's3:DeleteObject',
              Effect: 'Allow',
              Resource: `${bucket.bucketArn}/foo/*`,
            },
          ],
          Version: '2012-10-17',
        }
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[1],
        ssmEnvironmentEntriesStub
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

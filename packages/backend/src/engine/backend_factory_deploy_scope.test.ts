import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import {
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { CDKContextKey } from '@aws-amplify/platform-core';
import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BackendFactory } from '../backend_factory.js';

/**
 * Creates a CDK stack with branch deployment context and an optional deploy scope.
 */
const createStackWithDeployScope = (deployScope?: string): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-type', 'branch');
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  if (deployScope !== undefined) {
    app.node.setContext(CDKContextKey.DEPLOY_SCOPE, deployScope);
  }
  return new Stack(app);
};

/**
 * Creates a mock ConstructFactory with a trackable getInstance mock.
 * When getInstance is called, it creates a real S3 bucket in the construct tree
 * so that CDK synth works correctly.
 */
const createMockFactory = (
  resourceGroupName: string,
  provides?: string,
): ConstructFactory<ResourceProvider> & {
  getInstanceMock: ReturnType<typeof mock.fn>;
} => {
  const getInstanceMock = mock.fn(
    (props: ConstructFactoryGetInstanceProps): ResourceProvider => {
      return props.constructContainer.getOrCompute({
        resourceGroupName,
        generateContainerEntry: ({ scope }) => {
          return {
            resources: {
              bucket: new Bucket(scope, `${resourceGroupName}-bucket`),
            },
          };
        },
      });
    },
  );

  return {
    provides,
    getInstance: getInstanceMock,
    getInstanceMock,
  };
};

void describe('BackendFactory deploy scope filtering', () => {
  let rootStack: Stack;

  beforeEach(() => {
    rootStack = createStackWithDeployScope();
  });

  void describe('with no deployScope (full deploy)', () => {
    void it('instantiates all factories including hosting', () => {
      const authFactory = createMockFactory('auth');
      const dataFactory = createMockFactory('data');
      const hostingFactory = createMockFactory('hosting', 'HostingResources');

      const backend = new BackendFactory(
        { auth: authFactory, data: dataFactory, hosting: hostingFactory },
        rootStack,
      );

      assert.equal(authFactory.getInstanceMock.mock.callCount(), 1);
      assert.equal(dataFactory.getInstanceMock.mock.callCount(), 1);
      assert.equal(hostingFactory.getInstanceMock.mock.callCount(), 1);

      assert.ok(backend.resources.auth);
      assert.ok(backend.resources.data);
      assert.ok(backend.resources.hosting);
    });

    void it('creates nested stacks for all resources', () => {
      const authFactory = createMockFactory('auth');
      const hostingFactory = createMockFactory('hosting', 'HostingResources');

      new BackendFactory(
        { auth: authFactory, hosting: hostingFactory },
        rootStack,
      );

      // Both auth and hosting should have nested stacks
      assert.ok(rootStack.node.tryFindChild('auth'));
      assert.ok(rootStack.node.tryFindChild('hosting'));
    });
  });

  void describe('with deployScope = "backend"', () => {
    void it('skips hosting factory and instantiates non-hosting factories', () => {
      rootStack = createStackWithDeployScope('backend');

      const authFactory = createMockFactory('auth');
      const dataFactory = createMockFactory('data');
      const storageFactory = createMockFactory('storage');
      const hostingFactory = createMockFactory('hosting', 'HostingResources');

      const backend = new BackendFactory(
        {
          auth: authFactory,
          data: dataFactory,
          storage: storageFactory,
          hosting: hostingFactory,
        },
        rootStack,
      );

      assert.equal(authFactory.getInstanceMock.mock.callCount(), 1);
      assert.equal(dataFactory.getInstanceMock.mock.callCount(), 1);
      assert.equal(storageFactory.getInstanceMock.mock.callCount(), 1);
      assert.equal(
        hostingFactory.getInstanceMock.mock.callCount(),
        0,
        'hosting getInstance() should NOT be called in backend scope',
      );

      assert.ok(backend.resources.auth);
      assert.ok(backend.resources.data);
      assert.ok(backend.resources.storage);
      assert.equal(
        backend.resources.hosting,
        undefined,
        'hosting should not be in resources',
      );
    });

    void it('does not create a nested stack for hosting', () => {
      rootStack = createStackWithDeployScope('backend');

      const authFactory = createMockFactory('auth');
      const hostingFactory = createMockFactory('hosting', 'HostingResources');

      new BackendFactory(
        { auth: authFactory, hosting: hostingFactory },
        rootStack,
      );

      assert.ok(rootStack.node.tryFindChild('auth'));
      assert.equal(
        rootStack.node.tryFindChild('hosting'),
        undefined,
        'hosting nested stack should not be created in backend scope',
      );
    });

    void it('synths successfully without errors when hosting is skipped', () => {
      rootStack = createStackWithDeployScope('backend');

      const authFactory = createMockFactory('auth');
      const hostingFactory = createMockFactory('hosting', 'HostingResources');

      new BackendFactory(
        { auth: authFactory, hosting: hostingFactory },
        rootStack,
      );

      // CDK synth should not throw
      assert.doesNotThrow(() => {
        App.of(rootStack)!.synth();
      });
    });
  });

  void describe('with deployScope = "frontend"', () => {
    void it('only instantiates hosting factory and skips all others', () => {
      rootStack = createStackWithDeployScope('frontend');

      const authFactory = createMockFactory('auth');
      const dataFactory = createMockFactory('data');
      const storageFactory = createMockFactory('storage');
      const hostingFactory = createMockFactory('hosting', 'HostingResources');

      const backend = new BackendFactory(
        {
          auth: authFactory,
          data: dataFactory,
          storage: storageFactory,
          hosting: hostingFactory,
        },
        rootStack,
      );

      assert.equal(
        authFactory.getInstanceMock.mock.callCount(),
        0,
        'auth getInstance() should NOT be called in frontend scope',
      );
      assert.equal(
        dataFactory.getInstanceMock.mock.callCount(),
        0,
        'data getInstance() should NOT be called in frontend scope',
      );
      assert.equal(
        storageFactory.getInstanceMock.mock.callCount(),
        0,
        'storage getInstance() should NOT be called in frontend scope',
      );
      assert.equal(hostingFactory.getInstanceMock.mock.callCount(), 1);

      assert.equal(backend.resources.auth, undefined);
      assert.equal(backend.resources.data, undefined);
      assert.equal(backend.resources.storage, undefined);
      assert.ok(backend.resources.hosting);
    });

    void it('does not create nested stacks for non-hosting resources', () => {
      rootStack = createStackWithDeployScope('frontend');

      const authFactory = createMockFactory('auth');
      const hostingFactory = createMockFactory('hosting', 'HostingResources');

      new BackendFactory(
        { auth: authFactory, hosting: hostingFactory },
        rootStack,
      );

      assert.equal(
        rootStack.node.tryFindChild('auth'),
        undefined,
        'auth nested stack should not be created in frontend scope',
      );
      assert.ok(rootStack.node.tryFindChild('hosting'));
    });

    void it('synths successfully when only hosting is deployed', () => {
      rootStack = createStackWithDeployScope('frontend');

      const hostingFactory = createMockFactory('hosting', 'HostingResources');

      new BackendFactory({ hosting: hostingFactory }, rootStack);

      assert.doesNotThrow(() => {
        App.of(rootStack)!.synth();
      });
    });
  });

  void describe('factory provides registration', () => {
    void it('registers provides tokens even for skipped factories', () => {
      // The registerConstructFactory call happens before the deploy scope
      // filtering, so providers are registered even if they won't be instantiated.
      // This ensures dependency resolution metadata is available.
      rootStack = createStackWithDeployScope('backend');

      const authFactory = createMockFactory('auth', 'AuthResources');
      const hostingFactory = createMockFactory('hosting', 'HostingResources');

      // Should not throw even though hosting is skipped —
      // the factory registration loop is separate from instantiation.
      assert.doesNotThrow(() => {
        new BackendFactory(
          { auth: authFactory, hosting: hostingFactory },
          rootStack,
        );
      });
    });
  });

  void describe('factories without provides field', () => {
    void it('treats factories without provides as non-hosting in backend scope', () => {
      rootStack = createStackWithDeployScope('backend');

      const customFactory = createMockFactory('custom');
      const hostingFactory = createMockFactory('hosting', 'HostingResources');

      const backend = new BackendFactory(
        { custom: customFactory, hosting: hostingFactory },
        rootStack,
      );

      // Factory without `provides` is not hosting, so it should be instantiated
      assert.equal(customFactory.getInstanceMock.mock.callCount(), 1);
      assert.equal(hostingFactory.getInstanceMock.mock.callCount(), 0);
      assert.ok(backend.resources.custom);
      assert.equal(backend.resources.hosting, undefined);
    });

    void it('skips factories without provides in frontend scope', () => {
      rootStack = createStackWithDeployScope('frontend');

      const customFactory = createMockFactory('custom');
      const hostingFactory = createMockFactory('hosting', 'HostingResources');

      const backend = new BackendFactory(
        { custom: customFactory, hosting: hostingFactory },
        rootStack,
      );

      // Factory without `provides` is not hosting, so it should be skipped in frontend scope
      assert.equal(customFactory.getInstanceMock.mock.callCount(), 0);
      assert.equal(hostingFactory.getInstanceMock.mock.callCount(), 1);
      assert.equal(backend.resources.custom, undefined);
      assert.ok(backend.resources.hosting);
    });
  });

  void describe('edge cases', () => {
    void it('handles empty construct factories with backend scope', () => {
      rootStack = createStackWithDeployScope('backend');

      const backend = new BackendFactory({}, rootStack);

      assert.deepStrictEqual(backend.resources, {});
    });

    void it('handles empty construct factories with frontend scope', () => {
      rootStack = createStackWithDeployScope('frontend');

      assert.throws(
        () => new BackendFactory({}, rootStack),
        (err: Error) => {
          assert.equal(err.name, 'NoHostingDefinedError');
          return true;
        },
      );
    });

    void it('handles backend scope when no hosting factory is present', () => {
      rootStack = createStackWithDeployScope('backend');

      const authFactory = createMockFactory('auth');
      const dataFactory = createMockFactory('data');

      const backend = new BackendFactory(
        { auth: authFactory, data: dataFactory },
        rootStack,
      );

      // All factories should be instantiated since none are hosting
      assert.equal(authFactory.getInstanceMock.mock.callCount(), 1);
      assert.equal(dataFactory.getInstanceMock.mock.callCount(), 1);
      assert.ok(backend.resources.auth);
      assert.ok(backend.resources.data);
    });

    void it('throws NoHostingDefinedError when no hosting factory is present in frontend scope', () => {
      rootStack = createStackWithDeployScope('frontend');

      const authFactory = createMockFactory('auth');
      const dataFactory = createMockFactory('data');

      assert.throws(
        () =>
          new BackendFactory(
            { auth: authFactory, data: dataFactory },
            rootStack,
          ),
        (err: Error) => {
          assert.equal(err.name, 'NoHostingDefinedError');
          assert.match(err.message, /Cannot deploy frontend/);
          return true;
        },
      );

      // Neither factory should be instantiated since the error is thrown early
      assert.equal(authFactory.getInstanceMock.mock.callCount(), 0);
      assert.equal(dataFactory.getInstanceMock.mock.callCount(), 0);
    });
  });
});

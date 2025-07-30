import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyMapFactory, defineMap } from './map_factory.js';
import { App, Stack } from 'aws-cdk-lib';
import assert from 'node:assert';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceNameValidator,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ResourceNameValidatorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { MapResources } from './types.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { AmplifyMap } from './map_resource.js';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

let mapFactory: ConstructFactory<ResourceProvider<MapResources>>;
let constructContainer: ConstructContainer;
let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
let resourceNameValidator: ResourceNameValidator;

let getInstanceProps: ConstructFactoryGetInstanceProps;

void describe('AmplifyMapFactory', () => {
  beforeEach(() => {
    // Reset the static counter before each test
    AmplifyMapFactory.mapCount = 0;

    mapFactory = defineMap({
      name: 'testMap',
      access: (allow) => [allow.apiKey.to(['get'])],
      apiKeyProps: {
        apiKeyName: 'testKey',
      },
    });
    const stack = createStackAndSetContext();

    constructContainer = new ConstructContainerStub(
      new StackResolverStub(stack),
    );

    outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack,
    );

    resourceNameValidator = new ResourceNameValidatorStub();

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      resourceNameValidator,
    };
  });

  void describe('singleton validation', () => {
    beforeEach(() => {
      AmplifyMapFactory.mapCount = 0;

      const stack = createStackAndSetContext();

      constructContainer = new ConstructContainerStub(
        new StackResolverStub(stack),
      );

      outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
        stack,
      );

      resourceNameValidator = new ResourceNameValidatorStub();

      getInstanceProps = {
        constructContainer,
        outputStorageStrategy,
        resourceNameValidator,
      };
    });

    void it('returns singleton instance', () => {
      const instance1 = mapFactory.getInstance(getInstanceProps);
      const instance2 = mapFactory.getInstance(getInstanceProps);

      assert.strictEqual(instance1, instance2);
    });

    void it('allows single map creation', () => {
      const mapFactory = defineMap({
        name: 'singleMap',
      });

      const mapConstruct = mapFactory.getInstance(
        getInstanceProps,
      ) as AmplifyMap;
      assert.equal(mapConstruct.name, 'singleMap');
    });

    void it('prevents multiple map factory creation', () => {
      defineMap({
        name: 'firstMap',
      });

      assert.throws(
        () =>
          defineMap({
            name: 'secondMap',
          }),
        new AmplifyUserError('MultipleSingletonResourcesError', {
          message:
            'Multiple `defineMap` calls are not allowed within an Amplify backend',
          resolution: 'Remove all but one `defineMap` call',
        }),
      );
    });

    void it('throws on invalid name', () => {
      mock
        .method(resourceNameValidator, 'validate')
        .mock.mockImplementationOnce(() => {
          throw new Error(
            'Resource name verification failed, please set an appropriate resource name.',
          );
        });

      const mapInvalidFactory = defineMap({
        name: '|$%#86430resource',
      });
      assert.throws(
        () =>
          mapInvalidFactory.getInstance({
            ...getInstanceProps,
            resourceNameValidator,
          }),
        {
          message:
            'Resource name verification failed, please set an appropriate resource name.',
        },
      );
    });
  });

  void it('adds construct to stack', () => {
    const mapConstruct = mapFactory.getInstance(getInstanceProps) as AmplifyMap;

    // Maps don't create CloudFormation resources, but the construct
    assert.ok(mapConstruct.stack);
    assert.equal(mapConstruct.name, 'testMap');
  });

  void it('creates map with proper name and properties', () => {
    const mapConstruct = mapFactory.getInstance(getInstanceProps) as AmplifyMap;

    assert.equal(mapConstruct.name, 'testMap');
    assert.equal(typeof mapConstruct.resources.apiKey?.apiKeyName, 'string'); // API Key defined
  });

  void it('verifies stack property exists and is equal to map stack', () => {
    const mapConstruct = mapFactory.getInstance(getInstanceProps) as AmplifyMap;

    assert.equal(mapConstruct.stack, Stack.of(mapConstruct));
  });
});

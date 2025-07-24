import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPlaceFactory, definePlace } from './place_factory.js';
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
import { PlaceResources } from './types.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { AmplifyPlace } from './place_resource.js';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

let placeFactory: ConstructFactory<ResourceProvider<PlaceResources>>;
let constructContainer: ConstructContainer;
let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
let resourceNameValidator: ResourceNameValidator;

let getInstanceProps: ConstructFactoryGetInstanceProps;

void describe('AmplifyPlaceFactory', () => {
  beforeEach(() => {
    // Reset the static counter before each test
    AmplifyPlaceFactory.placeCount = 0;

    placeFactory = definePlace({
      name: 'testPlace',
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
      // Reset the static counter before each test
      AmplifyPlaceFactory.placeCount = 0;

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
      const instance1 = placeFactory.getInstance(getInstanceProps);
      const instance2 = placeFactory.getInstance(getInstanceProps);

      assert.strictEqual(instance1, instance2);
    });

    void it('allows single place creation', () => {
      const placeFactory = definePlace({
        name: 'singlePlace',
      });

      const placeConstruct = placeFactory.getInstance(
        getInstanceProps,
      ) as AmplifyPlace;
      assert.equal(placeConstruct.name, 'singlePlace');
    });

    void it('prevents multiple place factory creation', () => {
      definePlace({
        name: 'firstPlace',
      });

      assert.throws(
        () =>
          definePlace({
            name: 'secondPlace',
          }),
        new AmplifyUserError('MultipleSingletonResourcesError', {
          message:
            'Multiple `definePlace` calls not permitted within an Amplify backend',
          resolution: 'Maintain one `definePlace` call',
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

      const placeInvalidFactory = definePlace({
        name: '|$%#86430resource',
      });
      assert.throws(
        () =>
          placeInvalidFactory.getInstance({
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
    const placeConstruct = placeFactory.getInstance(
      getInstanceProps,
    ) as AmplifyPlace;

    // Places don't create CloudFormation resources, but the construct
    assert.ok(placeConstruct.stack);
    assert.equal(placeConstruct.name, 'testPlace');
  });

  void it('creates place with proper name and properties', () => {
    const placeConstruct = placeFactory.getInstance(
      getInstanceProps,
    ) as AmplifyPlace;

    assert.equal(placeConstruct.name, 'testPlace');
    assert.ok(placeConstruct.resources);
  });

  void it('verifies stack property exists and is equal to place stack', () => {
    const placeConstruct = placeFactory.getInstance(
      getInstanceProps,
    ) as AmplifyPlace;

    assert.equal(placeConstruct.stack, Stack.of(placeConstruct));
  });
});

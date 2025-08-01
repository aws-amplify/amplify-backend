import { beforeEach, describe, it, mock } from 'node:test';
import { defineCollection } from './collection_factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
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
import { CollectionResources } from './types.js';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

let collectionFactory: ConstructFactory<ResourceProvider<CollectionResources>>;
let constructContainer: ConstructContainer;
let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
let resourceNameValidator: ResourceNameValidator;

let getInstanceProps: ConstructFactoryGetInstanceProps;

void describe('AmplifyCollectionFactory', () => {
  beforeEach(() => {
    collectionFactory = defineCollection({
      name: 'testCollection',
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

  void it('returns singleton instance', () => {
    const instance1 = collectionFactory.getInstance(getInstanceProps);
    const instance2 = collectionFactory.getInstance(getInstanceProps);

    assert.strictEqual(instance1, instance2);
  });

  void it('adds construct to stack', () => {
    const collectionConstruct = collectionFactory.getInstance(getInstanceProps);

    const template = Template.fromStack(
      Stack.of(collectionConstruct.resources.cfnResources.cfnCollection),
    );

    template.resourceCountIs('AWS::Location::GeofenceCollection', 1);
  });

  void it('throws on invalid name', () => {
    mock
      .method(resourceNameValidator, 'validate')
      .mock.mockImplementationOnce(() => {
        throw new Error(
          'Resource name verification failed, please set an appropriate resource name.',
        );
      });

    const collectionFactory = defineCollection({
      name: '|$%#86430resource',
    });
    assert.throws(
      () =>
        collectionFactory.getInstance({
          ...getInstanceProps,
          resourceNameValidator,
        }),
      {
        message:
          'Resource name verification failed, please set an appropriate resource name.',
      },
    );
  });

  void it('applies friendly name tag', () => {
    const collectionConstruct = collectionFactory.getInstance(getInstanceProps);

    const template = Template.fromStack(
      Stack.of(collectionConstruct.resources.cfnResources.cfnCollection),
    );

    // Check that the friendly name tag is applied
    template.hasResourceProperties('AWS::Location::GeofenceCollection', {
      Tags: [
        {
          Key: 'amplify:friendly-name',
          Value: 'testCollection',
        },
      ],
    });
  });

  void it('creates collection with custom collection properties', () => {
    const customCollectionFactory = defineCollection({
      name: 'customCollection',
      description: 'Custom test collection',
      access: (allow) => [allow.apiKey.to(['create'])],
    });

    const collectionConstruct =
      customCollectionFactory.getInstance(getInstanceProps);

    const template = Template.fromStack(
      Stack.of(collectionConstruct.resources.cfnResources.cfnCollection),
    );
    template.hasResourceProperties('AWS::Location::GeofenceCollection', {
      CollectionName: 'customCollection',
      Description: 'Custom test collection',
    });
  });

  void it('verifies stack property exists and is equal to collection stack', () => {
    const collectionConstructFactory = defineCollection({
      name: 'testCollection',
    }).getInstance(getInstanceProps);

    assert.equal(
      collectionConstructFactory.stack,
      Stack.of(collectionConstructFactory.resources.cfnResources.cfnCollection),
    );
  });
});

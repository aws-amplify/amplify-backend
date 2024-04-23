import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { StorageContainerEntryGenerator } from './storage_container_entry_generator.js';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  SsmEnvironmentEntriesGeneratorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import {
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  GenerateContainerEntryProps,
  ResourceProvider,
  SsmEnvironmentEntriesGenerator,
} from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import { StorageAccessOrchestratorFactory } from './storage_access_orchestrator.js';
import { AmplifyStorage } from './construct.js';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  CfnFunction,
  Function,
  InlineCode,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';
import { StorageAccessGenerator } from './types.js';

void describe('StorageGenerator', () => {
  void describe('generateContainerEntry', () => {
    let getInstanceProps: ConstructFactoryGetInstanceProps;
    let stack: Stack;
    let ssmEnvironmentEntriesGenerator: SsmEnvironmentEntriesGenerator;
    let generateContainerEntryProps: GenerateContainerEntryProps;

    beforeEach(() => {
      stack = createStackAndSetContext();

      ssmEnvironmentEntriesGenerator = new SsmEnvironmentEntriesGeneratorStub(
        stack
      );

      generateContainerEntryProps = {
        scope: stack,
        ssmEnvironmentEntriesGenerator,
      } as unknown as GenerateContainerEntryProps;

      const constructContainer = new ConstructContainerStub(
        new StackResolverStub(stack)
      );

      const outputStorageStrategy =
        new StackMetadataBackendOutputStorageStrategy(stack);

      const importPathVerifier = new ImportPathVerifierStub();

      getInstanceProps = {
        constructContainer,
        outputStorageStrategy,
        importPathVerifier,
      };
    });
    void it('returns AmplifyStorage instance', () => {
      const storageGenerator = new StorageContainerEntryGenerator(
        { name: 'testName' },
        getInstanceProps,
        new StorageAccessOrchestratorFactory()
      );

      const storageInstance = storageGenerator.generateContainerEntry(
        generateContainerEntryProps
      );

      assert.ok(storageInstance instanceof AmplifyStorage);
    });

    void it('sets friendly-name tag on resources', () => {
      const storageGenerator = new StorageContainerEntryGenerator(
        {
          name: 'coolBucketName',
        },
        getInstanceProps,
        new StorageAccessOrchestratorFactory()
      );

      storageGenerator.generateContainerEntry(generateContainerEntryProps);

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::S3::Bucket', 1);
      template.hasResourceProperties('AWS::S3::Bucket', {
        Tags: [
          { Key: 'amplify:friendly-name', Value: 'coolBucketName' },
          // this tag is added by CDK but the assertion fails without it
          { Key: 'aws-cdk:auto-delete-objects', Value: 'true' },
        ],
      });
    });

    void it('invokes the policy orchestrator when access rules are defined', () => {
      const orchestrateStorageAccessMock = mock.fn();
      const storageAccessOrchestratorFactoryStub =
        new StorageAccessOrchestratorFactory();
      const getInstanceMock = mock.method(
        storageAccessOrchestratorFactoryStub,
        'getInstance',
        () => ({
          orchestrateStorageAccess: orchestrateStorageAccessMock,
        })
      );

      const accessRulesCallback: StorageAccessGenerator = () => ({});

      const storageGenerator = new StorageContainerEntryGenerator(
        {
          name: 'testName',
          access: accessRulesCallback,
        },
        getInstanceProps,
        storageAccessOrchestratorFactoryStub
      );

      storageGenerator.generateContainerEntry(generateContainerEntryProps);

      assert.equal(orchestrateStorageAccessMock.mock.callCount(), 1);
      assert.equal(
        getInstanceMock.mock.calls[0].arguments[0],
        accessRulesCallback
      );
    });

    void it('configures S3 triggers if defined', () => {
      let counter = 1;
      const stubFunctionFactory: ConstructFactory<
        ResourceProvider<FunctionResources>
      > = {
        getInstance: () => {
          const testFunction = new Function(stack, `testFunction${counter++}`, {
            code: new InlineCode('testCode'),
            handler: 'test.handler',
            runtime: Runtime.NODEJS_LATEST,
          });

          return {
            resources: {
              lambda: testFunction,
              cfnResources: {
                cfnFunction: testFunction.node.tryFindChild(
                  'Resource'
                ) as CfnFunction,
              },
            },
          };
        },
      };

      const storageGenerator = new StorageContainerEntryGenerator(
        {
          name: 'testName',
          triggers: {
            onUpload: stubFunctionFactory,
            onDelete: stubFunctionFactory,
          },
        },
        getInstanceProps,
        new StorageAccessOrchestratorFactory()
      );

      storageGenerator.generateContainerEntry(generateContainerEntryProps);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('Custom::S3BucketNotifications', {
        BucketName: {
          Ref: 'testNameBucketB4152AD5',
        },
        NotificationConfiguration: {
          LambdaFunctionConfigurations: [
            {
              Events: ['s3:ObjectCreated:*'],
              LambdaFunctionArn: {
                'Fn::GetAtt': ['testFunction19495DDB4', 'Arn'],
              },
            },
            {
              Events: ['s3:ObjectRemoved:*'],
              LambdaFunctionArn: {
                'Fn::GetAtt': ['testFunction25A740180', 'Arn'],
              },
            },
          ],
        },
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

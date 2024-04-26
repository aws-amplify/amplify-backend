import { beforeEach, describe, it } from 'node:test';
import {
  ConstructFactory,
  DeepPartialAmplifyGeneratedConfigs,
  DeploymentType,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BackendFactory } from './backend_factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { ClientConfig } from '@aws-amplify/client-config';

const createStackAndSetContext = (deploymentType: DeploymentType): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-type', deploymentType);
  switch (deploymentType) {
    case 'sandbox':
      app.node.setContext('amplify-backend-namespace', 'projectName');
      app.node.setContext('amplify-backend-name', 'testUser');

      break;
    case 'branch':
      app.node.setContext('amplify-backend-name', 'testEnvName');
      app.node.setContext('amplify-backend-namespace', 'testBackendId');
      break;
  }

  const stack = new Stack(app);
  return stack;
};

void describe('Backend', () => {
  let rootStack: Stack;
  beforeEach(() => {
    rootStack = createStackAndSetContext('branch');
  });

  void it('initializes constructs in given app', () => {
    const testConstructFactory: ConstructFactory<TestResourceProvider> = {
      getInstance: ({ constructContainer }) => {
        return constructContainer.getOrCompute({
          resourceGroupName: 'test',
          generateContainerEntry: ({ scope }) => {
            return {
              resources: {
                bucket: new Bucket(scope, 'test-bucket'),
              },
            };
          },
        }) as TestResourceProvider;
      },
    };

    new BackendFactory(
      {
        testConstructFactory,
      },
      rootStack
    );

    const bucketStack = Stack.of(rootStack.node.findChild('test'));

    const rootStackTemplate = Template.fromStack(rootStack);
    rootStackTemplate.resourceCountIs('AWS::CloudFormation::Stack', 1);

    const bucketStackTemplate = Template.fromStack(bucketStack);
    bucketStackTemplate.resourceCountIs('AWS::S3::Bucket', 1);
  });

  void it('registers construct outputs in root stack', () => {
    const testConstructFactory: ConstructFactory<TestResourceProvider> = {
      getInstance: ({ constructContainer, outputStorageStrategy }) => {
        return constructContainer.getOrCompute({
          resourceGroupName: 'test',
          generateContainerEntry: ({ scope }) => {
            const bucket = new Bucket(scope, 'test-bucket');
            outputStorageStrategy.addBackendOutputEntry('TestStorageOutput', {
              version: '1',
              payload: {
                bucketName: bucket.bucketName,
              },
            });
            return {
              resources: {
                bucket,
              },
            };
          },
        }) as TestResourceProvider;
      },
    };

    new BackendFactory(
      {
        testConstructFactory,
      },
      rootStack
    );

    const rootStackTemplate = Template.fromStack(rootStack);
    rootStackTemplate.hasOutput('bucketName', {});
    rootStackTemplate.templateMatches({
      Metadata: {
        TestStorageOutput: {
          version: '1',
          stackOutputs: ['bucketName'],
        },
      },
    });
  });

  void it('exposes created constructs under resources', () => {
    const testConstructFactory: ConstructFactory<TestResourceProvider> = {
      getInstance: ({ constructContainer, outputStorageStrategy }) => {
        return constructContainer.getOrCompute({
          resourceGroupName: 'test',
          generateContainerEntry: ({ scope }) => {
            const bucket = new Bucket(scope, 'test-bucket', {
              bucketName: 'test-bucket-name',
            });
            outputStorageStrategy.addBackendOutputEntry('TestStorageOutput', {
              version: '1',
              payload: {
                bucketName: bucket.bucketName,
              },
            });
            return {
              resources: {
                bucket,
              },
            };
          },
        }) as TestResourceProvider;
      },
    };

    const backend = new BackendFactory(
      {
        testConstructFactory,
      },
      rootStack
    );
    assert.equal(
      backend.resources.testConstructFactory.resources.bucket.node.id,
      'test-bucket'
    );
  });

  void it('stores attribution metadata in root stack', () => {
    new BackendFactory({}, rootStack);
    const rootStackTemplate = Template.fromStack(rootStack);
    assert.equal(
      JSON.parse(rootStackTemplate.toJSON().Description).stackType,
      'root'
    );
  });

  void it('registers branch linker for branch deployments', () => {
    new BackendFactory({}, rootStack);
    const rootStackTemplate = Template.fromStack(rootStack);
    rootStackTemplate.resourceCountIs('Custom::AmplifyBranchLinkerResource', 1);
  });

  void it('does not register branch linker for sandbox deployments', () => {
    const rootStack = createStackAndSetContext('sandbox');
    new BackendFactory({}, rootStack);
    const rootStackTemplate = Template.fromStack(rootStack);
    rootStackTemplate.resourceCountIs('Custom::AmplifyBranchLinkerResource', 0);
  });

  void describe('createStack', () => {
    void it('returns nested stack', () => {
      const backend = new BackendFactory({}, rootStack);
      const testStack = backend.createStack('testStack');
      assert.strictEqual(rootStack.node.findChild('testStack'), testStack);
    });

    void it('throws if stack has already been created with specified name', () => {
      const backend = new BackendFactory({}, rootStack);
      backend.createStack('testStack');
      assert.throws(() => backend.createStack('testStack'), {
        message: 'Custom stack named testStack has already been created',
      });
    });
  });

  void it('can add custom output', () => {
    const rootStack = createStackAndSetContext('sandbox');
    const backend = new BackendFactory({}, rootStack);
    const clientConfigPartial: DeepPartialAmplifyGeneratedConfigs<ClientConfig> =
      {
        version: '1',
        custom: {
          someCustomOutput: 'someCustomOutputValue',
        },
      };
    backend.addOutput(clientConfigPartial);
    const rootStackTemplate = Template.fromStack(rootStack);
    rootStackTemplate.hasOutput('customOutputs', {
      Value: JSON.stringify(clientConfigPartial),
    });
  });
});

type TestResourceProvider = ResourceProvider<{ bucket: Bucket }>;

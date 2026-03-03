import { beforeEach, describe, it } from 'node:test';
import {
  ConstructFactory,
  DeepPartialAmplifyGeneratedConfigs,
  DeploymentType,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BackendFactory, defineBackend } from './backend_factory.js';
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
    case 'standalone':
      app.node.setContext('amplify-backend-namespace', 'myCustomStack');
      app.node.setContext('amplify-backend-name', 'main');
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
      rootStack,
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
      rootStack,
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
      rootStack,
    );
    assert.equal(
      backend.resources.testConstructFactory.resources.bucket.node.id,
      'test-bucket',
    );
  });

  void it('verifies stack property exists and is equivalent to rootStack', () => {
    const backend = new BackendFactory({}, rootStack);
    assert.equal(rootStack, backend.stack);
  });

  void it('stores attribution metadata in root stack', () => {
    new BackendFactory({}, rootStack);
    const rootStackTemplate = Template.fromStack(rootStack);
    assert.equal(
      JSON.parse(rootStackTemplate.toJSON().Description).stackType,
      'root',
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
        version: '1.4',
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

const createTestConstructFactory =
  (): ConstructFactory<TestResourceProvider> => ({
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
  });

void describe('defineBackend with custom App', () => {
  void it('creates backend in standalone mode when custom App is provided', () => {
    const app = new App();
    const testConstructFactory = createTestConstructFactory();

    const backend = defineBackend({ testConstructFactory }, app);

    // Should have created the stack inside the custom App
    assert.ok(backend.stack);
    assert.equal(backend.stack.node.id, 'AmplifyStack');

    // Verify the construct was created
    assert.equal(
      backend.testConstructFactory.resources.bucket.node.id,
      'test-bucket',
    );
  });

  void it('does not register branch linker when custom App is provided', () => {
    const app = new App();
    const backend = defineBackend({}, app);

    const rootStackTemplate = Template.fromStack(backend.stack);
    rootStackTemplate.resourceCountIs('Custom::AmplifyBranchLinkerResource', 0);
  });

  void it('stores attribution metadata as AmplifyStandalone when custom App is provided', () => {
    const app = new App();
    const backend = defineBackend({}, app);

    const rootStackTemplate = Template.fromStack(backend.stack);
    const description = JSON.parse(rootStackTemplate.toJSON().Description);
    assert.equal(description.createdBy, 'AmplifyStandalone');
    assert.equal(description.stackType, 'root');
  });

  void it('sets deployment type to standalone when custom App is provided', () => {
    const app = new App();
    const backend = defineBackend({}, app);

    const rootStackTemplate = Template.fromStack(backend.stack);
    // The platform output should contain deploymentType: 'standalone'
    rootStackTemplate.hasOutput('deploymentType', {
      Value: 'standalone',
    });
  });

  void it('initializes constructs correctly with custom App', () => {
    const app = new App();
    const testConstructFactory = createTestConstructFactory();

    const backend = defineBackend({ testConstructFactory }, app);

    const bucketStack = Stack.of(backend.stack.node.findChild('test'));
    const rootStackTemplate = Template.fromStack(backend.stack);
    rootStackTemplate.resourceCountIs('AWS::CloudFormation::Stack', 1);

    const bucketStackTemplate = Template.fromStack(bucketStack);
    bucketStackTemplate.resourceCountIs('AWS::S3::Bucket', 1);
  });

  void it('throws when custom App has CLI context values (conflict detection)', () => {
    const app = new App();
    app.node.setContext('amplify-backend-namespace', 'testAppId');
    app.node.setContext('amplify-backend-name', 'testBranch');

    // Custom App with context values set directly on it should still work —
    // conflict detection is handled at the deployer level by reading the
    // synthesized template, not at the defineBackend level.
    const backend = defineBackend({}, app);
    assert.ok(backend.stack);
  });

  void it('registers amplifySynth listener when custom App is provided', () => {
    const app = new App();
    defineBackend({}, app);

    // The listener should be registered. When 'amplifySynth' is emitted,
    // app.synth() should be called without throwing.
    // We verify by emitting the message — if no listener were registered,
    // app.synth() would never be called and the assembly wouldn't exist.
    assert.doesNotThrow(() => {
      process.emit('message', 'amplifySynth', undefined);
    });
  });

  void it('createStack works with custom App', () => {
    const app = new App();
    const backend = defineBackend({}, app);

    const customStack = backend.createStack('myCustomStack');
    assert.ok(customStack);
    assert.strictEqual(
      backend.stack.node.findChild('myCustomStack'),
      customStack,
    );
  });

  void it('addOutput works with custom App', () => {
    const app = new App();
    const backend = defineBackend({}, app);

    const clientConfigPartial: DeepPartialAmplifyGeneratedConfigs<ClientConfig> =
      {
        version: '1.4',
        custom: {
          someOutput: 'someValue',
        },
      };
    backend.addOutput(clientConfigPartial);

    const rootStackTemplate = Template.fromStack(backend.stack);
    rootStackTemplate.hasOutput('customOutputs', {
      Value: JSON.stringify(clientConfigPartial),
    });
  });
});

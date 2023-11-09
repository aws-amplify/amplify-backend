import { beforeEach, describe, it } from 'node:test';
import { ConstructFactory, DeploymentType } from '@aws-amplify/plugin-types';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BackendFactory } from './backend_factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';

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
    const testConstructFactory: ConstructFactory<Bucket> = {
      getInstance({ constructContainer }): Bucket {
        return constructContainer.getOrCompute({
          resourceGroupName: 'test',
          generateContainerEntry(scope: Construct): Bucket {
            return new Bucket(scope, 'test-bucket');
          },
        }) as Bucket;
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
    const testConstructFactory: ConstructFactory<Bucket> = {
      getInstance({ constructContainer, outputStorageStrategy }): Bucket {
        return constructContainer.getOrCompute({
          resourceGroupName: 'test',
          generateContainerEntry(scope: Construct): Bucket {
            const bucket = new Bucket(scope, 'test-bucket');
            outputStorageStrategy.addBackendOutputEntry('TestStorageOutput', {
              version: '1',
              payload: {
                bucketName: bucket.bucketName,
              },
            });
            return bucket;
          },
        }) as Bucket;
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
    const testConstructFactory: ConstructFactory<Bucket> = {
      getInstance({ constructContainer, outputStorageStrategy }): Bucket {
        return constructContainer.getOrCompute({
          resourceGroupName: 'test',
          generateContainerEntry(scope: Construct): Bucket {
            const bucket = new Bucket(scope, 'test-bucket', {
              bucketName: 'test-bucket-name',
            });
            outputStorageStrategy.addBackendOutputEntry('TestStorageOutput', {
              version: '1',
              payload: {
                bucketName: bucket.bucketName,
              },
            });
            return bucket;
          },
        }) as Bucket;
      },
    };

    const backend = new BackendFactory(
      {
        testConstructFactory,
      },
      rootStack
    );
    assert.equal(backend.resources.testConstructFactory.node.id, 'test-bucket');
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

  void describe('getStack', () => {
    void it('returns nested stack', () => {
      const backend = new BackendFactory({}, rootStack);
      const testStack = backend.getStack('testStack');
      assert.strictEqual(rootStack.node.findChild('testStack'), testStack);
    });
  });
});

import { beforeEach, describe, it } from 'node:test';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Backend } from './backend.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('branch-name', 'testEnvName');
  app.node.setContext('backend-id', 'testBackendId');
  const stack = new Stack(app);
  return stack;
};

describe('Backend', () => {
  let rootStack: Stack;
  beforeEach(() => {
    rootStack = createStackAndSetContext();
  });

  it('initializes constructs in given app', () => {
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

    new Backend(
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

  it('registers construct outputs in root stack', () => {
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

    new Backend(
      {
        testConstructFactory,
      },
      rootStack
    );

    const rootStackTemplate = Template.fromStack(rootStack);
    rootStackTemplate.hasOutput('bucketName', {});
    rootStackTemplate.templateMatches({
      Metadata: {
        'AWS::Amplify::Output': {
          TestStorageOutput: {
            version: '1',
            stackOutputs: ['bucketName'],
          },
        },
      },
    });
  });

  it('exposes created constructs under resources', () => {
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

    const backend = new Backend(
      {
        testConstructFactory,
      },
      rootStack
    );
    assert.equal(backend.resources.testConstructFactory.node.id, 'test-bucket');
  });

  describe('getOrCreateStack', () => {
    it('returns nested stack', () => {
      const backend = new Backend({}, rootStack);
      const testStack = backend.getOrCreateStack('testStack');
      assert.strictEqual(rootStack.node.findChild('testStack'), testStack);
    });
  });
});

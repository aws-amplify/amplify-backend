import { describe, it } from 'node:test';
import { ConstructCache, ConstructFactory } from '@aws-amplify/plugin-types';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Backend } from './backend.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

describe('Backend', () => {
  it('initializes constructs in given app', () => {
    const testConstructFactory: ConstructFactory<Bucket> = {
      getInstance(resolver: ConstructCache): Bucket {
        resolver.getOrCompute({
          resourceGroupName: 'test',
          generateCacheEntry(scope: Construct): Bucket {
            return new Bucket(scope, 'test-bucket');
          },
        });
      },
    };

    const app = new App();
    new Backend(
      {
        testConstructFactory,
      },
      app
    );

    const rootStack = Stack.of(app.node.defaultChild);
    const bucketStack = Stack.of(rootStack.node.findChild('testStack'));

    const rootStackTemplate = Template.fromStack(rootStack);
    rootStackTemplate.resourceCountIs('AWS::CloudFormation::Stack', 1);

    const bucketStackTemplate = Template.fromStack(bucketStack);
    bucketStackTemplate.resourceCountIs('AWS::S3::Bucket', 1);
  });
});

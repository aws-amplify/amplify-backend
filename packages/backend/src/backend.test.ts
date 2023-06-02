import { describe, it } from 'node:test';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Backend } from './backend.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

describe('Backend', () => {
  it('initializes constructs in given app', () => {
    const testConstructFactory: ConstructFactory<Bucket> = {
      getInstance(resolver): Bucket {
        return resolver.getOrCompute({
          resourceGroupName: 'test',
          generateCacheEntry(scope: Construct): Bucket {
            return new Bucket(scope, 'test-bucket');
          },
        }) as Bucket;
      },
    };

    const app = new App();
    const rootStack = new Stack(app);
    new Backend(
      {
        testConstructFactory,
      },
      rootStack
    );

    const bucketStack = Stack.of(rootStack.node.findChild('testStack'));

    const rootStackTemplate = Template.fromStack(rootStack);
    rootStackTemplate.resourceCountIs('AWS::CloudFormation::Stack', 1);

    const bucketStackTemplate = Template.fromStack(bucketStack);
    bucketStackTemplate.resourceCountIs('AWS::S3::Bucket', 1);
  });

  it('registers construct outputs in root stack', () => {
    const testConstructFactory: ConstructFactory<Bucket> = {
      getInstance(resolver, platform): Bucket {
        return resolver.getOrCompute({
          resourceGroupName: 'test',
          generateCacheEntry(scope: Construct): Bucket {
            const bucket = new Bucket(scope, 'test-bucket');
            platform.outputStorageStrategy.storeOutputs(
              'test-plugin',
              '1.0.0',
              {
                bucketName: bucket.bucketName,
              }
            );
            return bucket;
          },
        }) as Bucket;
      },
    };

    const app = new App();
    const rootStack = new Stack(app);
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
        'test-plugin': {
          constructVersion: '1.0.0',
          stackOutputs: ['bucketName'],
        },
      },
    });
  });
});

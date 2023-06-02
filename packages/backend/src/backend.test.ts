import { describe, it } from 'node:test';
import {
  ConstructCache,
  ConstructFactory,
  FrontendConfigValuesProvider,
  OutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Backend } from './backend.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

describe('Backend', () => {
  it('initializes constructs in given app', () => {
    const testConstructFactory: ConstructFactory<Bucket> = {
      getInstance(resolver: ConstructCache): Bucket {
        return resolver.getOrCompute({
          resourceGroupName: 'test',
          generateCacheEntry(scope: Construct): Bucket {
            return new Bucket(scope, 'test-bucket');
          },
        }) as Bucket;
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

  it('registers construct outputs in root stack', () => {
    // stub implementation of a construct that is also a FrontendConfigValuesProvider
    class TestConstruct
      extends Construct
      implements FrontendConfigValuesProvider
    {
      private bucket: Bucket;
      constructor(scope: Construct, id: string) {
        super(scope, id);

        this.bucket = new Bucket(scope, `${id}Bucket`);
      }

      provideFrontendConfigValues(registry: OutputStorageStrategy): void {
        registry.storeOutputs('test-frontend-plugin', '2.0.0', {
          bucketName: this.bucket.bucketName,
        });
      }
    }
    // stub implementation of a construct factory that returns the TestConstruct
    const testConstructFactory: ConstructFactory<TestConstruct> = {
      getInstance(resolver: ConstructCache): TestConstruct {
        return resolver.getOrCompute({
          resourceGroupName: 'test',
          generateCacheEntry(scope: Construct): TestConstruct {
            return new TestConstruct(scope, 'test-construct');
          },
        }) as TestConstruct;
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
    const rootStackTemplate = Template.fromStack(rootStack);
    rootStackTemplate.hasOutput('bucketName', {});
  });
});

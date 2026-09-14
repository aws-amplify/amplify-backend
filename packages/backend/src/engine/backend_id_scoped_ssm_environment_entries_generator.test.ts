import { describe, it } from 'node:test';
import { BackendIdScopedSsmEnvironmentEntriesGenerator } from './backend_id_scoped_ssm_environment_entries_generator.js';
import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import assert from 'node:assert';
import { Template } from 'aws-cdk-lib/assertions';

void describe('BackendIdScopedSsmEnvironmentEntriesGenerator', () => {
  void it('creates ssm params and returns parameter name as string', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack');
    const ssmEnvironmentEntriesGenerator =
      new BackendIdScopedSsmEnvironmentEntriesGenerator(stack, {
        name: 'testName',
        namespace: 'testNamespace',
        type: 'branch',
      });

    const bucket = new Bucket(stack, 'testBucket');
    const queue = new Queue(stack, 'testQueue');

    const ssmEnvironmentEntries =
      ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries({
        bucketName: bucket.bucketName,
        queueArn: queue.queueArn,
      });

    assert.deepStrictEqual(ssmEnvironmentEntries, [
      {
        name: 'BUCKET_NAME',
        // eslint-disable-next-line spellcheck/spell-checker
        path: '/amplify/resource_reference/testNamespace/testName-branch-85fd30d970/BUCKET_NAME',
      },
      {
        name: 'QUEUE_ARN',
        // eslint-disable-next-line spellcheck/spell-checker
        path: '/amplify/resource_reference/testNamespace/testName-branch-85fd30d970/QUEUE_ARN',
      },
    ]);

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::SSM::Parameter', 2);
    template.hasResourceProperties('AWS::SSM::Parameter', {
      // eslint-disable-next-line spellcheck/spell-checker
      Name: '/amplify/resource_reference/testNamespace/testName-branch-85fd30d970/QUEUE_ARN',
      Type: 'String',

      Value: {
        'Fn::GetAtt': ['testQueue601B0FCD', 'Arn'],
      },
    });
    template.hasResourceProperties('AWS::SSM::Parameter', {
      // eslint-disable-next-line spellcheck/spell-checker
      Name: '/amplify/resource_reference/testNamespace/testName-branch-85fd30d970/BUCKET_NAME',
      Type: 'String',
      Value: {
        Ref: 'testBucketDF4D7D1A',
      },
    });
  });
});

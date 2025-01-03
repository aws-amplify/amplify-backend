import { describe, it } from 'node:test';
import { AmplifyStorage } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { HttpMethods } from 'aws-cdk-lib/aws-s3';

void describe('AmplifyStorage', () => {
  void it('creates a bucket', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'test', { name: 'testName' });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  void it('turns versioning on if specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'test', { versioned: true, name: 'testName' });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: { Status: 'Enabled' },
    });
  });

  void it('stores attribution data in stack', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testAuth', { name: 'testName' });

    const template = Template.fromStack(stack);
    assert.equal(
      JSON.parse(template.toJSON().Description).stackType,
      'storage-S3'
    );
  });

  void it('enables cors on the bucket', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testAuth', { name: 'testName' });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
            AllowedOrigins: ['*'],
            ExposedHeaders: [
              'x-amz-server-side-encryption',
              'x-amz-request-id',
              'x-amz-id-2',
              'ETag',
            ],
            MaxAge: 3000,
          },
        ],
      },
    });
  });

  void it('allows the user to override the default cors settings', () => {
    const expectedCorsSettings = {
      maxAge: 100,
      allowedHeaders: ['example-header'],
      allowedMethods: [HttpMethods.GET],
      allowedOrigins: ['my-origin.aws.com'],
      exposedHeaders: ['*'],
    };
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testAuth', {
      name: 'testName',
      cors: [expectedCorsSettings],
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: [
          {
            AllowedHeaders: expectedCorsSettings.allowedHeaders,
            AllowedMethods: expectedCorsSettings.allowedMethods,
            AllowedOrigins: expectedCorsSettings.allowedOrigins,
            ExposedHeaders: expectedCorsSettings.exposedHeaders,
            MaxAge: expectedCorsSettings.maxAge,
          },
        ],
      },
    });
  });

  void it('sets destroy retain policy and auto-delete objects true', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testBucketId', { name: 'testName' });

    const template = Template.fromStack(stack);
    const buckets = template.findResources('AWS::S3::Bucket');
    const bucketLogicalIds = Object.keys(buckets);
    assert.equal(bucketLogicalIds.length, 1);
    const bucket = buckets[bucketLogicalIds[0]];
    assert.equal(bucket.DeletionPolicy, 'Delete');
    assert.equal(bucket.UpdateReplacePolicy, 'Delete');

    template.hasResourceProperties('Custom::S3AutoDeleteObjects', {
      BucketName: {
        Ref: 'testBucketIdBucket3B30067A',
      },
    });
  });

  void it('forces SSL', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testBucketId', { name: 'testName' });

    const template = Template.fromStack(stack);

    const policyCapture = new Capture();
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      Bucket: { Ref: 'testBucketIdBucket3B30067A' },
      PolicyDocument: policyCapture,
    });

    assert.match(
      JSON.stringify(policyCapture.asObject()),
      /"aws:SecureTransport":"false"/
    );
  });

  void describe('storage overrides', () => {
    void it('can override bucket properties', () => {
      const app = new App();
      const stack = new Stack(app);

      const bucket = new AmplifyStorage(stack, 'test', { name: 'testName' });
      bucket.resources.cfnResources.cfnBucket.accelerateConfiguration = {
        accelerationStatus: 'Enabled',
      };

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        AccelerateConfiguration: {
          AccelerationStatus: 'Enabled',
        },
      });
    });
  });
});

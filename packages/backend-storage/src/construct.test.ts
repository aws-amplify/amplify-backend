import { describe, it } from 'node:test';
import { AmplifyStorage } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { CDKContextKey } from '@aws-amplify/platform-core';

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
      'storage-S3',
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
      /"aws:SecureTransport":"false"/,
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

void describe('AmplifyStorage removalPolicy', () => {
  void it('defaults to destroy when no removalPolicy is specified', () => {
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

  void it('sets retain policy when removalPolicy is retain in non-sandbox', () => {
    const app = new App();
    app.node.setContext(CDKContextKey.DEPLOYMENT_TYPE, 'branch');
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testBucketId', {
      name: 'testName',
      removalPolicy: 'retain',
    });

    const template = Template.fromStack(stack);
    const buckets = template.findResources('AWS::S3::Bucket');
    const bucketLogicalIds = Object.keys(buckets);
    assert.equal(bucketLogicalIds.length, 1);
    const bucket = buckets[bucketLogicalIds[0]];
    assert.equal(bucket.DeletionPolicy, 'Retain');
    assert.equal(bucket.UpdateReplacePolicy, 'Retain');

    // auto-delete objects custom resource should NOT exist when retaining
    template.resourceCountIs('Custom::S3AutoDeleteObjects', 0);
  });

  void it('sets destroy policy when removalPolicy is explicitly destroy', () => {
    const app = new App();
    app.node.setContext(CDKContextKey.DEPLOYMENT_TYPE, 'branch');
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testBucketId', {
      name: 'testName',
      removalPolicy: 'destroy',
    });

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

  void it('forces destroy in sandbox even when removalPolicy is retain', () => {
    const app = new App();
    app.node.setContext(CDKContextKey.DEPLOYMENT_TYPE, 'sandbox');
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testBucketId', {
      name: 'testName',
      removalPolicy: 'retain',
    });

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

  void it('respects explicit destroy in sandbox', () => {
    const app = new App();
    app.node.setContext(CDKContextKey.DEPLOYMENT_TYPE, 'sandbox');
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testBucketId', {
      name: 'testName',
      removalPolicy: 'destroy',
    });
    const template = Template.fromStack(stack);
    const buckets = template.findResources('AWS::S3::Bucket');
    const bucketLogicalIds = Object.keys(buckets);
    assert.equal(bucketLogicalIds.length, 1);
    const bucket = buckets[bucketLogicalIds[0]];
    assert.equal(bucket.DeletionPolicy, 'Delete');
    assert.equal(bucket.UpdateReplacePolicy, 'Delete');
    template.hasResourceProperties('Custom::S3AutoDeleteObjects', {
      BucketName: { Ref: 'testBucketIdBucket3B30067A' },
    });
  });

  void it('defaults to destroy in sandbox when no removalPolicy is specified', () => {
    const app = new App();
    app.node.setContext(CDKContextKey.DEPLOYMENT_TYPE, 'sandbox');
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
});

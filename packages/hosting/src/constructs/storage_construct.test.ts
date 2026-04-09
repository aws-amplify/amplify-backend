import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StorageConstruct } from './storage_construct.js';

// ---- Test helpers ----

const createStack = (): Stack => {
  const app = new App();
  return new Stack(app, 'TestStack');
};

// ================================================================
// StorageConstruct — isolated unit tests
// ================================================================

void describe('StorageConstruct', () => {
  // ---- Default bucket security ----

  void describe('default S3 bucket', () => {
    void it('creates bucket with BlockPublicAccess.BLOCK_ALL', () => {
      const stack = createStack();
      new StorageConstruct(stack, 'Storage');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    void it('enables versioning', () => {
      const stack = createStack();
      new StorageConstruct(stack, 'Storage');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: { Status: 'Enabled' },
      });
    });

    void it('uses SSE-S3 encryption', () => {
      const stack = createStack();
      new StorageConstruct(stack, 'Storage');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
      });
    });

    void it('enforces SSL via bucket policy', () => {
      const stack = createStack();
      new StorageConstruct(stack, 'Storage');
      const template = Template.fromStack(stack);

      // CDK enforceSSL adds a bucket policy denying non-SSL requests
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Deny',
              Condition: Match.objectLike({
                // eslint-disable-next-line spellcheck/spell-checker
                Bool: { 'aws:SecureTransport': 'false' },
              }),
            }),
          ]),
        }),
      });
    });
  });

  // ---- Lifecycle rules ----

  void describe('lifecycle rules', () => {
    void it('sets default build retention of 365 days', () => {
      const stack = createStack();
      new StorageConstruct(stack, 'Storage');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: Match.objectLike({
          Rules: Match.arrayWith([
            Match.objectLike({
              Id: 'DeleteOldBuilds',
              Prefix: 'builds/',
              ExpirationInDays: 365,
              Status: 'Enabled',
            }),
          ]),
        }),
      });
    });

    void it('sets noncurrent version expiration to 30 days', () => {
      const stack = createStack();
      new StorageConstruct(stack, 'Storage');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: Match.objectLike({
          Rules: Match.arrayWith([
            Match.objectLike({
              Id: 'ExpireNoncurrentVersions',
              NoncurrentVersionExpiration: {
                NoncurrentDays: 30,
              },
              Status: 'Enabled',
            }),
          ]),
        }),
      });
    });
  });

  // ---- Retain on delete ----

  void describe('retainOnDelete', () => {
    void it('sets RemovalPolicy.RETAIN when retainOnDelete is true', () => {
      const stack = createStack();
      new StorageConstruct(stack, 'Storage', { retainOnDelete: true });
      const template = Template.fromStack(stack);

      // With RETAIN, DeletionPolicy is Retain
      const buckets = template.findResources('AWS::S3::Bucket');
      const hostingBucket = Object.entries(buckets).find(([key]) =>
        key.includes('HostingBucket'),
      );
      assert.ok(hostingBucket, 'Should find HostingBucket');
      assert.strictEqual(
        (hostingBucket[1] as Record<string, unknown>).DeletionPolicy,
        'Retain',
        'DeletionPolicy should be Retain',
      );
    });

    void it('sets RemovalPolicy.DESTROY when retainOnDelete is false (default)', () => {
      const stack = createStack();
      new StorageConstruct(stack, 'Storage');
      const template = Template.fromStack(stack);

      const buckets = template.findResources('AWS::S3::Bucket');
      const hostingBucket = Object.entries(buckets).find(([key]) =>
        key.includes('HostingBucket'),
      );
      assert.ok(hostingBucket, 'Should find HostingBucket');
      assert.strictEqual(
        (hostingBucket[1] as Record<string, unknown>).DeletionPolicy,
        'Delete',
        'DeletionPolicy should be Delete',
      );
    });
  });

  // ---- Access logging ----

  void describe('access logging', () => {
    void it('creates access log bucket when accessLogging is true', () => {
      const stack = createStack();
      const storage = new StorageConstruct(stack, 'Storage', {
        accessLogging: true,
      });
      const template = Template.fromStack(stack);

      assert.ok(storage.accessLogBucket, 'Should expose accessLogBucket');
      // 2 buckets: hosting + access log
      template.resourceCountIs('AWS::S3::Bucket', 2);
    });

    void it('sets default access log retention to 90 days', () => {
      const stack = createStack();
      new StorageConstruct(stack, 'Storage', { accessLogging: true });
      const template = Template.fromStack(stack);

      // Find the access log bucket via lifecycle rule ID
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: Match.objectLike({
          Rules: Match.arrayWith([
            Match.objectLike({
              Id: 'ExpireAccessLogs',
              ExpirationInDays: 90,
              Status: 'Enabled',
            }),
          ]),
        }),
      });
    });

    void it('does not create access log bucket when accessLogging is false (default)', () => {
      const stack = createStack();
      const storage = new StorageConstruct(stack, 'Storage');
      const template = Template.fromStack(stack);

      assert.strictEqual(
        storage.accessLogBucket,
        undefined,
        'accessLogBucket should be undefined',
      );
      // Only the hosting bucket (+ CDK autoDeleteObjects custom resource bucket if any)
      // At minimum: just 1 S3 bucket
      const buckets = template.findResources('AWS::S3::Bucket');
      const accessLogBuckets = Object.entries(buckets).filter(([key]) =>
        key.includes('AccessLogBucket'),
      );
      assert.strictEqual(
        accessLogBuckets.length,
        0,
        'Should not have AccessLogBucket',
      );
    });
  });
});

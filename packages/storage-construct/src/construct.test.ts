import { describe, it } from 'node:test';
import { AmplifyStorage } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';

import assert from 'node:assert';

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

  void it('has grantAccess method', () => {
    const app = new App();
    const stack = new Stack(app);
    const storage = new AmplifyStorage(stack, 'test', { name: 'testName' });

    // Test that grantAccess method exists
    assert.equal(typeof storage.grantAccess, 'function');
  });

  void it('validates auth construct in grantAccess', () => {
    const app = new App();
    const stack = new Stack(app);
    const storage = new AmplifyStorage(stack, 'test', { name: 'testName' });

    const accessConfig = {
      'photos/*': [
        { type: 'authenticated' as const, actions: ['read' as const] },
      ],
    };

    // Should throw with null auth construct
    assert.throws(() => {
      storage.grantAccess(null, accessConfig);
    }, /Invalid auth construct/);

    // Should throw with undefined auth construct
    assert.throws(() => {
      storage.grantAccess(undefined, accessConfig);
    }, /Invalid auth construct/);
  });

  void it('processes access config with mock auth', () => {
    const app = new App();
    const stack = new Stack(app);
    const storage = new AmplifyStorage(stack, 'test', { name: 'testName' });

    // Create mock auth construct
    const mockAuth = { mockAuthConstruct: true };
    const accessConfig = {
      'photos/*': [
        {
          type: 'authenticated' as const,
          actions: ['read' as const, 'write' as const],
        },
        { type: 'guest' as const, actions: ['read' as const] },
      ],
      'documents/*': [
        { type: 'authenticated' as const, actions: ['read' as const] },
      ],
    };

    // Should not throw with valid mock auth
    storage.grantAccess(mockAuth, accessConfig);
  });

  void it('handles owner access type', () => {
    const app = new App();
    const stack = new Stack(app);
    const storage = new AmplifyStorage(stack, 'test', { name: 'testName' });

    const mockAuth = { mockAuthConstruct: true };
    const accessConfig = {
      'private/{entity_id}/*': [
        {
          type: 'owner' as const,
          actions: ['read' as const, 'write' as const, 'delete' as const],
        },
      ],
    };

    // Should handle owner access without throwing
    storage.grantAccess(mockAuth, accessConfig);
  });

  void it('handles group access type', () => {
    const app = new App();
    const stack = new Stack(app);
    const storage = new AmplifyStorage(stack, 'test', { name: 'testName' });

    const mockAuth = { mockAuthConstruct: true };
    const accessConfig = {
      'admin/*': [
        {
          type: 'groups' as const,
          actions: ['read' as const, 'write' as const],
          groups: ['admin', 'moderator'],
        },
      ],
    };

    // Should handle group access without throwing
    storage.grantAccess(mockAuth, accessConfig);
  });

  void it('handles all storage actions', () => {
    const app = new App();
    const stack = new Stack(app);
    const storage = new AmplifyStorage(stack, 'test', { name: 'testName' });

    const mockAuth = { mockAuthConstruct: true };
    const accessConfig = {
      'test/*': [
        {
          type: 'authenticated' as const,
          actions: ['read' as const, 'write' as const, 'delete' as const],
        },
      ],
    };

    // Should handle all action types without throwing
    storage.grantAccess(mockAuth, accessConfig);
  });

  void it('validates path patterns', () => {
    const app = new App();
    const stack = new Stack(app);
    const storage = new AmplifyStorage(stack, 'test', { name: 'testName' });

    const mockAuth = { mockAuthConstruct: true };

    // Should throw for invalid path (not ending with /*)
    assert.throws(() => {
      storage.grantAccess(mockAuth, {
        'invalid-path': [
          { type: 'authenticated' as const, actions: ['read' as const] },
        ],
      });
    }, /Storage access paths must end with/);
  });

  void it('handles complex path hierarchies', () => {
    const app = new App();
    const stack = new Stack(app);
    const storage = new AmplifyStorage(stack, 'test', { name: 'testName' });

    const mockAuth = { mockAuthConstruct: true };
    const accessConfig = {
      'public/*': [
        { type: 'authenticated' as const, actions: ['read' as const] },
        { type: 'guest' as const, actions: ['read' as const] },
      ],
      'private/{entity_id}/*': [
        {
          type: 'owner' as const,
          actions: ['read' as const, 'write' as const, 'delete' as const],
        },
      ],
      'shared/documents/*': [
        {
          type: 'authenticated' as const,
          actions: ['read' as const, 'write' as const],
        },
      ],
    };

    // Should handle complex path scenarios without throwing
    storage.grantAccess(mockAuth, accessConfig);
  });

  void it('validates entity_id token placement', () => {
    const app = new App();
    const stack = new Stack(app);
    const storage = new AmplifyStorage(stack, 'test', { name: 'testName' });

    const mockAuth = { mockAuthConstruct: true };

    // Should throw for entity_id not at end
    assert.throws(() => {
      storage.grantAccess(mockAuth, {
        'users/{entity_id}/documents/files/*': [
          { type: 'owner' as const, actions: ['read' as const] },
        ],
      });
    }, /must be the path part right before the ending wildcard/);
  });

  void it('prevents too many path prefixes', () => {
    const app = new App();
    const stack = new Stack(app);
    const storage = new AmplifyStorage(stack, 'test', { name: 'testName' });

    const mockAuth = { mockAuthConstruct: true };

    // Should throw for too many nested paths
    assert.throws(() => {
      storage.grantAccess(mockAuth, {
        'foo/*': [
          { type: 'authenticated' as const, actions: ['read' as const] },
        ],
        'foo/bar/*': [
          { type: 'authenticated' as const, actions: ['read' as const] },
        ],
        'foo/bar/baz/*': [
          { type: 'authenticated' as const, actions: ['read' as const] },
        ],
      });
    }, /only one other path can be a prefix/);
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

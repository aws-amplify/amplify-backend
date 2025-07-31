import { beforeEach, describe, it } from 'node:test';
import { AmplifyCollection } from './collection_construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import * as kms from 'aws-cdk-lib/aws-kms';

void describe('AmplifyCollection', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app);
  });
  void it('creates a geofence collection', () => {
    new AmplifyCollection(stack, 'testCollection', {
      name: 'testCollectionName',
      isDefault: false,
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Location::GeofenceCollection', 1);
  });

  void it('sets collection name correctly', () => {
    new AmplifyCollection(stack, 'testCollection', {
      name: 'myTestCollection',
      isDefault: false,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Location::GeofenceCollection', {
      CollectionName: 'myTestCollection',
    });
  });

  void it('sets isDefault property correctly when true', () => {
    const collection = new AmplifyCollection(stack, 'testCollection', {
      name: 'testCollectionName',
      isDefault: true,
    });

    assert.equal(collection.isDefault, true);
    assert.equal(collection.name, 'testCollectionName');
    assert.equal(collection.id, 'testCollection');
  });

  void it('sets isDefault property correctly when false', () => {
    const collection = new AmplifyCollection(stack, 'testCollection', {
      name: 'testCollectionName',
      isDefault: false,
    });

    assert.equal(collection.isDefault, false);
  });

  void it('defaults isDefault to false when not specified', () => {
    const collection = new AmplifyCollection(stack, 'testCollection', {
      name: 'testCollectionName',
    });

    assert.equal(collection.isDefault, false);
  });

  void it('stores attribution data in stack', () => {
    new AmplifyCollection(stack, 'testCollection', {
      name: 'testCollectionName',
      isDefault: false,
    });

    const template = Template.fromStack(stack);
    assert.equal(
      JSON.parse(template.toJSON().Description).stackType,
      'geo-GeofenceCollection',
    );
  });

  void it('sets collection description when provided', () => {
    new AmplifyCollection(stack, 'testCollection', {
      name: 'testCollectionName',
      description: 'Test geofence collection for unit testing',
      isDefault: false,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Location::GeofenceCollection', {
      CollectionName: 'testCollectionName',
      Description: 'Test geofence collection for unit testing',
    });
  });

  void it('sets KMS key when provided', () => {
    new AmplifyCollection(stack, 'testCollection', {
      name: 'testCollectionName',
      kmsKey: new kms.Key(stack, 'testKey', {}),
      isDefault: false,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Location::GeofenceCollection', {
      CollectionName: 'testCollectionName',
      KmsKeyId: {
        'Fn::GetAtt': ['testKey1CDDDD5E', 'Arn'],
      },
    });
  });

  void it('exposes collection resource correctly', () => {
    const amplifyCollection = new AmplifyCollection(stack, 'testCollection', {
      name: 'testCollectionName',
      isDefault: false,
    });

    assert.ok(amplifyCollection.resources.cfnResources.cfnCollection);
  });

  void it('exposes CFN resources for overrides', () => {
    const amplifyCollection = new AmplifyCollection(stack, 'testCollection', {
      name: 'testCollectionName',
      isDefault: false,
    });

    // Test that CFN resource is accessible for overrides
    assert.ok(amplifyCollection.resources.cfnResources.cfnCollection);
    assert.equal(
      amplifyCollection.resources.cfnResources.cfnCollection.collectionName,
      'testCollectionName',
    );
  });

  void it('sets tags when provided via CFN resource', () => {
    const collection = new AmplifyCollection(stack, 'testCollection', {
      name: 'testCollectionName',
      isDefault: false,
    });

    // Set tags via the exposed CFN resource
    collection.resources.cfnResources.cfnCollection.tags = [
      {
        key: 'Environment',
        value: 'test',
      },
      {
        key: 'Project',
        value: 'amplify-geo',
      },
    ];

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Location::GeofenceCollection', {
      CollectionName: 'testCollectionName',
      Tags: [
        {
          Key: 'Environment',
          Value: 'test',
        },
        {
          Key: 'Project',
          Value: 'amplify-geo',
        },
      ],
    });
  });

  void describe('collection overrides', () => {
    void it('can override collection properties', () => {
      const collection = new AmplifyCollection(stack, 'testCollection', {
        name: 'testCollectionName',
        isDefault: false,
      });

      // Override the description via CFN resource
      collection.resources.cfnResources.cfnCollection.description =
        'Overridden description';

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Location::GeofenceCollection', {
        CollectionName: 'testCollectionName',
        Description: 'Overridden description',
      });
    });

    void it('can override KMS key via CFN resource', () => {
      const collection = new AmplifyCollection(stack, 'testCollection', {
        name: 'testCollectionName',
        isDefault: false,
      });

      collection.resources.cfnResources.cfnCollection.kmsKeyId =
        'arn:aws:kms:us-west-2:123456789012:key/87654321-4321-4321-4321-210987654321';

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Location::GeofenceCollection', {
        CollectionName: 'testCollectionName',
        KmsKeyId:
          'arn:aws:kms:us-west-2:123456789012:key/87654321-4321-4321-4321-210987654321',
      });
    });
  });

  void describe('resource properties validation', () => {
    void it('creates collection with minimal required properties', () => {
      const collection = new AmplifyCollection(stack, 'minimalCollection', {
        name: 'minimal',
        isDefault: false,
      });

      assert.equal(collection.name, 'minimal');
      assert.equal(collection.id, 'minimalCollection');
      assert.equal(collection.isDefault, false);
      assert.ok(collection.resources.cfnResources.cfnCollection);

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::Location::GeofenceCollection', 1);
      template.hasResourceProperties('AWS::Location::GeofenceCollection', {
        CollectionName: Match.stringLikeRegexp('.*minimal.*'),
      });
    });

    void it('creates collection with all optional properties', () => {
      const collection = new AmplifyCollection(stack, 'fullCollection', {
        name: 'fullFeatureCollection',
        description: 'A fully configured geofence collection',
        kmsKey: new kms.Key(stack, 'testKey', {}),
        isDefault: true,
      });

      assert.equal(collection.name, 'fullFeatureCollection');
      assert.equal(collection.id, 'fullCollection');
      assert.equal(collection.isDefault, true);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Location::GeofenceCollection', {
        CollectionName: 'fullFeatureCollection',
        Description: 'A fully configured geofence collection',
        KmsKeyId: {
          'Fn::GetAtt': ['testKey1CDDDD5E', 'Arn'],
        },
      });
    });
  });
});

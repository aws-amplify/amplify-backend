import { App, Stack } from 'aws-cdk-lib';
import { beforeEach, describe, it } from 'node:test';
import { GeoAccessPolicyFactory } from './geo_access_policy_factory.js';
import assert from 'node:assert';
import { Template } from 'aws-cdk-lib/assertions';
import { AccountPrincipal, Policy, Role } from 'aws-cdk-lib/aws-iam';

void describe('GeoAccessPolicyFactory', () => {
  let stack: Stack;
  let geoAccessPolicyFactory: GeoAccessPolicyFactory;
  const testResourceArn =
    'arn:aws:geo:us-east-1:123456789012:geofence-collection/test-collection';
  const testResourceName = 'testResource';

  beforeEach(() => {
    const app = new App();
    stack = new Stack(app);
    geoAccessPolicyFactory = new GeoAccessPolicyFactory();
  });

  void it('throws if no permissions are specified', () => {
    assert.throws(() =>
      geoAccessPolicyFactory.createPolicy(
        [],
        testResourceArn,
        'test-role',
        testResourceName,
        stack,
      ),
    );
  });

  void it('returns policy with get actions', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['get'],
      testResourceArn,
      'authenticated',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-authenticated-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: ['geo-maps:GetStaticMap', 'geo-maps:GetTile'],
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void it('returns policy with autocomplete actions', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['autocomplete'],
      testResourceArn,
      'guest',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-guest-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: 'geo-places:Autocomplete',
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void it('returns policy with geocode actions', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['geocode'],
      testResourceArn,
      'authenticated',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-authenticated-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: ['geo-places:Geocode', 'geo-places:ReverseGeocode'],
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void it('returns policy with search actions', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['search'],
      testResourceArn,
      'authenticated',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-authenticated-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'geo-places:GetPlace',
              'geo-places:SearchNearby',
              'geo-places:SearchText',
              'geo-places:Suggest',
            ],
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void it('returns policy with create actions', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['create'],
      testResourceArn,
      'authenticated',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-authenticated-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: 'geo:CreateGeofenceCollection',
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void it('returns policy with read actions', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['read'],
      testResourceArn,
      'authenticated',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-authenticated-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'geo:DescribeGeofenceCollection',
              'geo:BatchEvaluateGeofences',
              'geo:ForecastGeofenceEvents',
              'geo:GetGeofence',
            ],
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void it('returns policy with update actions', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['update'],
      testResourceArn,
      'authenticated',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-authenticated-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'geo:BatchPutGeofence',
              'geo:PutGeofence',
              'geo:UpdateGeofenceCollection',
            ],
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void it('returns policy with delete actions', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['delete'],
      testResourceArn,
      'authenticated',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-authenticated-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: ['geo:BatchDeleteGeofence', 'geo:DeleteGeofenceCollection'],
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void it('returns policy with list actions', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['list'],
      testResourceArn,
      'authenticated',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-authenticated-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: ['geo:ListGeofences', 'geo:ListGeofenceCollections'],
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void it('handles multiple actions in single policy', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['read', 'create', 'update'],
      testResourceArn,
      'authenticated',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-authenticated-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'geo:DescribeGeofenceCollection',
              'geo:BatchEvaluateGeofences',
              'geo:ForecastGeofenceEvents',
              'geo:GetGeofence',
              'geo:CreateGeofenceCollection',
              'geo:BatchPutGeofence',
              'geo:PutGeofence',
              'geo:UpdateGeofenceCollection',
            ],
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void it('creates policy with custom role token', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['read'],
      testResourceArn,
      'custom-role-token',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-custom-role-token-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'geo:DescribeGeofenceCollection',
              'geo:BatchEvaluateGeofences',
              'geo:ForecastGeofenceEvents',
              'geo:GetGeofence',
            ],
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void it('handles different resource ARNs', () => {
    const mapResourceArn = 'arn:aws:geo:us-east-1:123456789012:map/test-map';
    const policy = geoAccessPolicyFactory.createPolicy(
      ['get'],
      mapResourceArn,
      'authenticated',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-authenticated-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: ['geo-maps:GetStaticMap', 'geo-maps:GetTile'],
            Resource: mapResourceArn,
          },
        ],
      },
    });
  });

  void it('creates policy with place index resource for search actions', () => {
    const placeIndexArn =
      'arn:aws:geo:us-east-1:123456789012:place-index/test-place-index';
    const policy = geoAccessPolicyFactory.createPolicy(
      ['search', 'geocode'],
      placeIndexArn,
      'authenticated',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-authenticated-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'geo-places:GetPlace',
              'geo-places:SearchNearby',
              'geo-places:SearchText',
              'geo-places:Suggest',
              'geo-places:Geocode',
              'geo-places:ReverseGeocode',
            ],
            Resource: placeIndexArn,
          },
        ],
      },
    });
  });

  void it('handles group role tokens', () => {
    const policy = geoAccessPolicyFactory.createPolicy(
      ['read', 'update'],
      testResourceArn,
      'group-admin',
      testResourceName,
      stack,
    );

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') }),
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'geo-testResource-group-admin-access-policy',
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'geo:DescribeGeofenceCollection',
              'geo:BatchEvaluateGeofences',
              'geo:ForecastGeofenceEvents',
              'geo:GetGeofence',
              'geo:BatchPutGeofence',
              'geo:PutGeofence',
              'geo:UpdateGeofenceCollection',
            ],
            Resource: testResourceArn,
          },
        ],
      },
    });
  });

  void describe('API key functionality', () => {
    void it('generateKeyActions returns correct actions for single map action', () => {
      const keyActions = geoAccessPolicyFactory.generateKeyActions(['get']);

      assert.deepStrictEqual(keyActions, [
        'geo-maps:GetStaticMap',
        'geo-maps:GetTile',
      ]);
    });

    void it('generateKeyActions returns correct actions for single place action', () => {
      const keyActions = geoAccessPolicyFactory.generateKeyActions(['search']);

      assert.deepStrictEqual(keyActions, [
        'geo-places:GetPlace',
        'geo-places:SearchNearby',
        'geo-places:SearchText',
        'geo-places:Suggest',
      ]);
    });

    void it('generateKeyActions returns correct actions for geocode', () => {
      const keyActions = geoAccessPolicyFactory.generateKeyActions(['geocode']);

      assert.deepStrictEqual(keyActions, [
        'geo-places:Geocode',
        'geo-places:ReverseGeocode',
      ]);
    });

    void it('generateKeyActions returns correct actions for autocomplete', () => {
      const keyActions = geoAccessPolicyFactory.generateKeyActions([
        'autocomplete',
      ]);

      assert.deepStrictEqual(keyActions, ['geo-places:Autocomplete']);
    });

    void it('generateKeyActions handles multiple actions', () => {
      const keyActions = geoAccessPolicyFactory.generateKeyActions([
        'search',
        'geocode',
        'autocomplete',
      ]);

      assert.deepStrictEqual(keyActions, [
        'geo-places:GetPlace',
        'geo-places:SearchNearby',
        'geo-places:SearchText',
        'geo-places:Suggest',
        'geo-places:Geocode',
        'geo-places:ReverseGeocode',
        'geo-places:Autocomplete',
      ]);
    });

    void it('generateKeyActions handles mixed map and place actions', () => {
      const keyActions = geoAccessPolicyFactory.generateKeyActions([
        'get',
        'search',
      ]);

      assert.deepStrictEqual(keyActions, [
        'geo-maps:GetStaticMap',
        'geo-maps:GetTile',
        'geo-places:GetPlace',
        'geo-places:SearchNearby',
        'geo-places:SearchText',
        'geo-places:Suggest',
      ]);
    });

    void it('generateKeyActions returns empty array for empty input', () => {
      const keyActions = geoAccessPolicyFactory.generateKeyActions([]);

      assert.deepStrictEqual(keyActions, []);
    });

    void it('generateKeyActions handles duplicate actions', () => {
      const keyActions = geoAccessPolicyFactory.generateKeyActions([
        'get',
        'get',
      ]);

      // Should include duplicates as they appear in the input
      assert.deepStrictEqual(keyActions, [
        'geo-maps:GetStaticMap',
        'geo-maps:GetTile',
        'geo-maps:GetStaticMap',
        'geo-maps:GetTile',
      ]);
    });

    void it('generateKeyActions handles all place actions', () => {
      const keyActions = geoAccessPolicyFactory.generateKeyActions([
        'search',
        'geocode',
        'autocomplete',
      ]);

      assert.deepStrictEqual(keyActions, [
        'geo-places:GetPlace',
        'geo-places:SearchNearby',
        'geo-places:SearchText',
        'geo-places:Suggest',
        'geo-places:Geocode',
        'geo-places:ReverseGeocode',
        'geo-places:Autocomplete',
      ]);
    });

    void it('generateKeyActions preserves action order', () => {
      const keyActions = geoAccessPolicyFactory.generateKeyActions([
        'autocomplete',
        'get',
        'search',
      ]);

      assert.deepStrictEqual(keyActions, [
        'geo-places:Autocomplete',
        'geo-maps:GetStaticMap',
        'geo-maps:GetTile',
        'geo-places:GetPlace',
        'geo-places:SearchNearby',
        'geo-places:SearchText',
        'geo-places:Suggest',
      ]);
    });
  });
});

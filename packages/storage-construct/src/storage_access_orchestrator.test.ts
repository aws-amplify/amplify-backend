/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, it, mock } from 'node:test';
import { StorageAccessOrchestrator } from './storage_access_orchestrator.js';
import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import assert from 'node:assert';
import { entityIdPathToken, entityIdSubstitution } from './constants.js';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';

void describe('StorageAccessOrchestrator', () => {
  void describe('orchestrateStorageAccess', () => {
    let stack: Stack;
    let bucket: Bucket;
    let storageAccessPolicyFactory: StorageAccessPolicyFactory;
    let authRole: Role;
    let unauthRole: Role;

    beforeEach(() => {
      stack = createStackAndSetContext();
      bucket = new Bucket(stack, 'testBucket');
      storageAccessPolicyFactory = new StorageAccessPolicyFactory(bucket);

      authRole = new Role(stack, 'AuthRole', {
        assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
      });
      unauthRole = new Role(stack, 'UnauthRole', {
        assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
      });
    });

    void it('throws if access prefixes are invalid', () => {
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      assert.throws(
        () =>
          storageAccessOrchestrator.orchestrateStorageAccess({
            'test/prefix': [
              {
                // Invalid: missing /*
                role: authRole,
                actions: ['read', 'write'],
                idSubstitution: '*',
              },
            ],
          } as any),
        { message: /must end with/ },
      );
    });

    void it('throws if duplicate access definitions exist for same role and path', () => {
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      assert.throws(
        () =>
          storageAccessOrchestrator.orchestrateStorageAccess({
            'test/prefix/*': [
              {
                role: authRole,
                actions: ['read'],
                idSubstitution: '*',
              },
              {
                // Duplicate: same role and idSubstitution
                role: authRole,
                actions: ['write'],
                idSubstitution: '*',
              },
            ],
          }),
        { message: /Multiple access rules for the same role/ },
      );
    });

    void it('passes expected policy to role', () => {
      const attachInlinePolicyMock = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        'test/prefix/*': [
          {
            role: authRole,
            actions: ['read', 'write'],
            idSubstitution: '*',
          },
        ],
      });

      // Storage-construct may create multiple policies, so check >= 1
      assert.ok(attachInlinePolicyMock.mock.callCount() >= 1);

      // Collect all statements from all policy calls
      const allStatements = attachInlinePolicyMock.mock.calls
        .map((call) => call.arguments[0].document.toJSON().Statement)
        .flat();

      // Verify GetObject statement with correct resource
      const getStatements = allStatements.filter(
        (s: any) => s.Action === 's3:GetObject',
      );
      assert.ok(getStatements.length >= 1);
      const getResources = getStatements.map((s: any) => s.Resource).flat();
      assert.ok(getResources.includes(`${bucket.bucketArn}/test/prefix/*`));

      // Verify PutObject statement with correct resource
      const putStatements = allStatements.filter(
        (s: any) => s.Action === 's3:PutObject',
      );
      assert.ok(putStatements.length >= 1);
      const putResources = putStatements.map((s: any) => s.Resource).flat();
      assert.ok(putResources.includes(`${bucket.bucketArn}/test/prefix/*`));

      // Verify all statements have correct Effect and Version
      allStatements.forEach((s: any) => {
        assert.equal(s.Effect, 'Allow');
      });

      const policy = attachInlinePolicyMock.mock.calls[0].arguments[0];
      assert.equal(policy.document.toJSON().Version, '2012-10-17');
    });

    void it('handles multiple permissions for the same role', () => {
      const attachInlinePolicyMock = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        'test/prefix/*': [
          {
            role: authRole,
            actions: ['read', 'write', 'delete'],
            idSubstitution: '*',
          },
        ],
        'another/prefix/*': [
          {
            role: authRole,
            actions: ['read'],
            idSubstitution: '*',
          },
        ],
      });

      // Storage-construct may create multiple policies
      assert.ok(attachInlinePolicyMock.mock.callCount() >= 1);

      // Collect all statements from all policy calls
      const allStatements = attachInlinePolicyMock.mock.calls
        .map((call) => call.arguments[0].document.toJSON().Statement)
        .flat();

      // Verify GetObject statement with correct resources
      const getStatements = allStatements.filter(
        (s: any) => s.Action === 's3:GetObject',
      );
      assert.ok(getStatements.length >= 1);
      const getResources = getStatements.map((s: any) => s.Resource).flat();
      assert.ok(getResources.includes(`${bucket.bucketArn}/test/prefix/*`));
      assert.ok(getResources.includes(`${bucket.bucketArn}/another/prefix/*`));

      // Verify PutObject statement
      const putStatements = allStatements.filter(
        (s: any) => s.Action === 's3:PutObject',
      );
      assert.ok(putStatements.length >= 1);
      const putResources = putStatements.map((s: any) => s.Resource).flat();
      assert.ok(putResources.includes(`${bucket.bucketArn}/test/prefix/*`));

      // Verify DeleteObject statement
      const deleteStatements = allStatements.filter(
        (s: any) => s.Action === 's3:DeleteObject',
      );
      assert.ok(deleteStatements.length >= 1);
      const deleteResources = deleteStatements
        .map((s: any) => s.Resource)
        .flat();
      assert.ok(deleteResources.includes(`${bucket.bucketArn}/test/prefix/*`));

      // Verify all statements have correct Effect
      allStatements.forEach((s: any) => {
        assert.equal(s.Effect, 'Allow');
      });
    });

    void it('handles multiple roles', () => {
      const attachInlinePolicyMockAuth = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const attachInlinePolicyMockUnauth = mock.method(
        unauthRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        'test/prefix/*': [
          {
            role: authRole,
            actions: ['read', 'write', 'delete'],
            idSubstitution: '*',
          },
          {
            role: unauthRole,
            actions: ['read'],
            idSubstitution: '*',
          },
        ],
        'another/prefix/*': [
          {
            role: unauthRole,
            actions: ['read', 'delete'],
            idSubstitution: '*',
          },
        ],
      });

      // Both roles should have policies attached
      assert.ok(attachInlinePolicyMockAuth.mock.callCount() >= 1);
      assert.ok(attachInlinePolicyMockUnauth.mock.callCount() >= 1);
    });

    void it('replaces owner placeholder in s3 prefix', () => {
      const attachInlinePolicyMock = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        [`test/${entityIdPathToken}/*`]: [
          {
            role: authRole,
            actions: ['read', 'write'],
            idSubstitution: entityIdSubstitution,
          },
        ],
      });

      assert.ok(attachInlinePolicyMock.mock.callCount() >= 1);

      // Collect all statements and verify entity substitution
      const allStatements = attachInlinePolicyMock.mock.calls
        .map((call) => call.arguments[0].document.toJSON().Statement)
        .flat();

      // Verify GetObject statement with entity substitution
      const getStatements = allStatements.filter(
        (s: any) => s.Action === 's3:GetObject',
      );
      assert.ok(getStatements.length >= 1);
      const getResources = getStatements.map((s: any) => s.Resource).flat();
      assert.ok(
        getResources.some((r: string) => r.includes(entityIdSubstitution)),
      );
      assert.ok(
        getResources.some((r: string) =>
          r.includes(`test/${entityIdSubstitution}`),
        ),
      );

      // Verify PutObject statement with entity substitution
      const putStatements = allStatements.filter(
        (s: any) => s.Action === 's3:PutObject',
      );
      assert.ok(putStatements.length >= 1);
      const putResources = putStatements.map((s: any) => s.Resource).flat();
      assert.ok(
        putResources.some((r: string) => r.includes(entityIdSubstitution)),
      );

      // Verify all statements have correct Effect
      allStatements.forEach((s: any) => {
        assert.equal(s.Effect, 'Allow');
      });
    });

    void it('denies parent actions on a subpath by default', () => {
      const attachInlinePolicyMockAuth = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const attachInlinePolicyMockUnauth = mock.method(
        unauthRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        'foo/*': [
          {
            role: authRole,
            actions: ['read', 'write'],
            idSubstitution: '*',
          },
        ],
        'foo/bar/*': [
          {
            role: unauthRole,
            actions: ['read'],
            idSubstitution: '*',
          },
        ],
      });

      // Both roles should have policies
      assert.ok(attachInlinePolicyMockAuth.mock.callCount() >= 1);
      assert.ok(attachInlinePolicyMockUnauth.mock.callCount() >= 1);

      // Verify deny-by-default logic creates deny statements
      const authPolicy = attachInlinePolicyMockAuth.mock.calls[0].arguments[0];
      const authStatements = authPolicy.document.toJSON().Statement;
      const hasDenyStatement = authStatements.some(
        (s: any) => s.Effect === 'Deny',
      );
      assert.ok(
        hasDenyStatement,
        'Should have deny statements for parent-child paths',
      );
    });

    void it('replaces "read" access with "get" and "list"', () => {
      const attachInlinePolicyMock = mock.method(
        authRole,
        'attachInlinePolicy',
      );
      const storageAccessOrchestrator = new StorageAccessOrchestrator(
        storageAccessPolicyFactory,
      );

      storageAccessOrchestrator.orchestrateStorageAccess({
        'foo/bar/*': [
          {
            role: authRole,
            actions: ['read'],
            idSubstitution: '*',
          },
        ],
      });

      assert.ok(attachInlinePolicyMock.mock.callCount() >= 1);

      // Collect all statements from all policy calls
      const allStatements = attachInlinePolicyMock.mock.calls
        .map((call) => call.arguments[0].document.toJSON().Statement)
        .flat();

      // Verify GetObject statement (from read expansion)
      const getStatements = allStatements.filter(
        (s: any) => s.Action === 's3:GetObject',
      );
      assert.ok(getStatements.length >= 1);
      assert.equal(getStatements[0].Effect, 'Allow');
      const getResources = getStatements.map((s: any) => s.Resource).flat();
      assert.ok(getResources.includes(`${bucket.bucketArn}/foo/bar/*`));

      // Verify ListBucket statement (from read expansion)
      const listStatements = allStatements.filter(
        (s: any) => s.Action === 's3:ListBucket',
      );
      assert.ok(listStatements.length >= 1);
      assert.equal(listStatements[0].Effect, 'Allow');
      assert.equal(listStatements[0].Resource, bucket.bucketArn);
      assert.deepStrictEqual(listStatements[0].Condition, {
        StringLike: {
          's3:prefix': ['foo/bar/*', 'foo/bar/'],
        },
      });
    });
  });
});

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('StorageAccessOrchestrator Performance Tests', () => {
  let stack: Stack;
  let bucket: Bucket;
  let storageAccessPolicyFactory: StorageAccessPolicyFactory;
  let authRole: Role;

  beforeEach(() => {
    stack = createStackAndSetContext();
    bucket = new Bucket(stack, 'testBucket');
    storageAccessPolicyFactory = new StorageAccessPolicyFactory(bucket);

    authRole = new Role(stack, 'AuthRole', {
      assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
    });
  });

  void it('optimizes large policy sets efficiently', () => {
    const attachInlinePolicyMock = mock.method(authRole, 'attachInlinePolicy');
    const storageAccessOrchestrator = new StorageAccessOrchestrator(
      storageAccessPolicyFactory,
    );

    // Create 50 similar paths that should be optimized
    const accessDefinitions: any = {};
    for (let i = 0; i < 50; i++) {
      accessDefinitions[`files/folder${i}/*`] = [
        {
          role: authRole,
          actions: ['read'],
          idSubstitution: '*',
        },
      ];
    }
    // Add parent path that should subsume all others
    accessDefinitions['files/*'] = [
      {
        role: authRole,
        actions: ['read'],
        idSubstitution: '*',
      },
    ];

    const startTime = Date.now();
    storageAccessOrchestrator.orchestrateStorageAccess(accessDefinitions);
    const endTime = Date.now();

    // Should complete quickly (under 1 second)
    assert.ok(
      endTime - startTime < 1000,
      'Should optimize large policy sets quickly',
    );

    // Should create policies (may be multiple)
    assert.ok(attachInlinePolicyMock.mock.callCount() >= 1);
  });

  void it('handles complex nested hierarchies without performance degradation', () => {
    const attachInlinePolicyMock = mock.method(authRole, 'attachInlinePolicy');
    const storageAccessOrchestrator = new StorageAccessOrchestrator(
      storageAccessPolicyFactory,
    );

    // Create complex nested structure
    const accessDefinitions: any = {
      'level1/*': [{ role: authRole, actions: ['read'], idSubstitution: '*' }],
      'level1/level2a/*': [
        { role: authRole, actions: ['read'], idSubstitution: '*' },
      ],
      'level1/level2b/*': [
        { role: authRole, actions: ['read'], idSubstitution: '*' },
      ],
      'level1/level2c/*': [
        { role: authRole, actions: ['read'], idSubstitution: '*' },
      ],
      'other1/*': [{ role: authRole, actions: ['read'], idSubstitution: '*' }],
      'other1/sub/*': [
        { role: authRole, actions: ['read'], idSubstitution: '*' },
      ],
      'other2/*': [{ role: authRole, actions: ['read'], idSubstitution: '*' }],
      'other2/sub/*': [
        { role: authRole, actions: ['read'], idSubstitution: '*' },
      ],
    };

    const startTime = Date.now();
    storageAccessOrchestrator.orchestrateStorageAccess(accessDefinitions);
    const endTime = Date.now();

    // Should handle complexity efficiently
    assert.ok(
      endTime - startTime < 500,
      'Should handle complex hierarchies quickly',
    );

    // Should create policies
    assert.ok(attachInlinePolicyMock.mock.callCount() >= 1);
  });
});

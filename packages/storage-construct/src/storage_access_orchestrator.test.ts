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
                actions: ['get', 'write'],
                idSubstitution: '*',
              },
            ],
          } as any),
        { message: /must end with/ },
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
            actions: ['get', 'write'],
            idSubstitution: '*',
          },
        ],
      });

      // Storage-construct may create multiple policies, so check >= 1
      assert.ok(attachInlinePolicyMock.mock.callCount() >= 1);
      const policy = attachInlinePolicyMock.mock.calls[0].arguments[0];
      const statements = policy.document.toJSON().Statement;

      // Verify expected actions are present
      const actions = statements.map((s: any) => s.Action).flat();
      assert.ok(actions.includes('s3:GetObject'));
      assert.ok(actions.includes('s3:PutObject'));
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
            actions: ['get', 'write', 'delete'],
            idSubstitution: '*',
          },
        ],
        'another/prefix/*': [
          {
            role: authRole,
            actions: ['get'],
            idSubstitution: '*',
          },
        ],
      });

      // Storage-construct may create multiple policies
      assert.ok(attachInlinePolicyMock.mock.callCount() >= 1);

      // Verify all expected actions are present across all policies
      const allStatements = attachInlinePolicyMock.mock.calls
        .map((call) => call.arguments[0].document.toJSON().Statement)
        .flat();
      const allActions = allStatements.map((s: any) => s.Action).flat();

      assert.ok(allActions.includes('s3:GetObject'));
      assert.ok(allActions.includes('s3:PutObject'));
      assert.ok(allActions.includes('s3:DeleteObject'));
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
            actions: ['get', 'write', 'delete'],
            idSubstitution: '*',
          },
          {
            role: unauthRole,
            actions: ['get'],
            idSubstitution: '*',
          },
        ],
        'another/prefix/*': [
          {
            role: unauthRole,
            actions: ['get', 'delete'],
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
            actions: ['get', 'write'],
            idSubstitution: entityIdSubstitution,
          },
        ],
      });

      assert.ok(attachInlinePolicyMock.mock.callCount() >= 1);
      const policy = attachInlinePolicyMock.mock.calls[0].arguments[0];
      const policyStr = JSON.stringify(policy.document.toJSON());

      // Verify entity substitution occurred
      assert.ok(policyStr.includes(entityIdSubstitution));
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
            actions: ['get', 'write'],
            idSubstitution: '*',
          },
        ],
        'foo/bar/*': [
          {
            role: unauthRole,
            actions: ['get'],
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
      const policy = attachInlinePolicyMock.mock.calls[0].arguments[0];
      const statements = policy.document.toJSON().Statement;
      const actions = statements.map((s: any) => s.Action).flat();

      // Verify read expands to get and list
      assert.ok(actions.includes('s3:GetObject'));
      assert.ok(actions.includes('s3:ListBucket'));
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
          actions: ['get'],
          idSubstitution: '*',
        },
      ];
    }
    // Add parent path that should subsume all others
    accessDefinitions['files/*'] = [
      {
        role: authRole,
        actions: ['get'],
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
      'level1/*': [{ role: authRole, actions: ['get'], idSubstitution: '*' }],
      'level1/level2a/*': [
        { role: authRole, actions: ['get'], idSubstitution: '*' },
      ],
      'level1/level2b/*': [
        { role: authRole, actions: ['get'], idSubstitution: '*' },
      ],
      'level1/level2c/*': [
        { role: authRole, actions: ['get'], idSubstitution: '*' },
      ],
      'other1/*': [{ role: authRole, actions: ['get'], idSubstitution: '*' }],
      'other1/sub/*': [
        { role: authRole, actions: ['get'], idSubstitution: '*' },
      ],
      'other2/*': [{ role: authRole, actions: ['get'], idSubstitution: '*' }],
      'other2/sub/*': [
        { role: authRole, actions: ['get'], idSubstitution: '*' },
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

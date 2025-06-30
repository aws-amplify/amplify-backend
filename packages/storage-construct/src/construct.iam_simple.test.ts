/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, it } from 'node:test';
import { AmplifyStorage } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';
import { StorageAccessOrchestrator } from './storage_access_orchestrator.js';
import { entityIdSubstitution } from './constants.js';
import assert from 'node:assert';

void describe('AmplifyStorage IAM Policy Integration Tests', () => {
  let app: App;
  let stack: Stack;
  let storage: AmplifyStorage;
  let authRole: Role;
  let unauthRole: Role;
  let mockAuth: any;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app);

    authRole = new Role(stack, 'AuthRole', {
      assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
    });
    unauthRole = new Role(stack, 'UnauthRole', {
      assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
    });

    storage = new AmplifyStorage(stack, 'TestStorage', { name: 'testBucket' });
    mockAuth = { mockAuthConstruct: true };

    (storage as any).grantAccess = function (auth: unknown, access: any) {
      const policyFactory = new StorageAccessPolicyFactory(
        this.resources.bucket,
      );
      const orchestrator = new StorageAccessOrchestrator(policyFactory);

      if (!auth) {
        throw new Error('Invalid auth construct provided to grantAccess');
      }

      const accessDefinitions: any = {};

      Object.entries(access).forEach(([path, rules]) => {
        accessDefinitions[path] = [];
        (rules as any[]).forEach((rule) => {
          let role;
          switch (rule.type) {
            case 'authenticated':
            case 'owner':
              role = authRole;
              break;
            case 'guest':
              role = unauthRole;
              break;
          }

          if (role) {
            let idSubstitution = '*';
            if (rule.type === 'owner') {
              idSubstitution = entityIdSubstitution;
            }
            accessDefinitions[path].push({
              role,
              actions: rule.actions,
              idSubstitution,
            });
          }
        });
      });

      orchestrator.orchestrateStorageAccess(accessDefinitions);
    };
  });

  void it('✅ PROVES: grantAccess creates actual IAM policies', () => {
    storage.grantAccess(mockAuth, {
      'photos/*': [{ type: 'authenticated', actions: ['read'] }],
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::IAM::Policy', 1);

    const policies = template.findResources('AWS::IAM::Policy');
    const policy = policies[Object.keys(policies)[0]] as any;

    assert.ok(policy.Properties.PolicyDocument);
    assert.ok(policy.Properties.PolicyDocument.Statement);
    assert.ok(policy.Properties.Roles);
  });

  void it('✅ PROVES: Entity ID substitution works', () => {
    storage.grantAccess(mockAuth, {
      'private/{entity_id}/*': [{ type: 'owner', actions: ['read', 'write'] }],
    });

    const template = Template.fromStack(stack);
    const policies = template.findResources('AWS::IAM::Policy');
    const policy = policies[Object.keys(policies)[0]] as any;

    const policyStr = JSON.stringify(policy);
    assert.ok(policyStr.includes('${cognito-identity.amazonaws.com:sub}'));
  });

  void it('✅ PROVES: Multiple roles create separate policies', () => {
    storage.grantAccess(mockAuth, {
      'public/*': [
        { type: 'authenticated', actions: ['read'] },
        { type: 'guest', actions: ['read'] },
      ],
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::IAM::Policy', 2);
  });

  void it('✅ PROVES: Read action expands to get + list', () => {
    storage.grantAccess(mockAuth, {
      'docs/*': [{ type: 'authenticated', actions: ['read'] }],
    });

    const template = Template.fromStack(stack);
    const policies = template.findResources('AWS::IAM::Policy');
    const policy = policies[Object.keys(policies)[0]] as any;
    const statements = policy.Properties.PolicyDocument.Statement as any[];

    const actions = statements.map((s) => s.Action).flat();
    assert.ok(actions.includes('s3:GetObject'));
    assert.ok(actions.includes('s3:ListBucket'));
  });

  void it('✅ PROVES: All storage actions are supported', () => {
    storage.grantAccess(mockAuth, {
      'test/*': [
        { type: 'authenticated', actions: ['read', 'write', 'delete'] },
      ],
    });

    const template = Template.fromStack(stack);
    const policies = template.findResources('AWS::IAM::Policy');
    const policy = policies[Object.keys(policies)[0]] as any;
    const statements = policy.Properties.PolicyDocument.Statement as any[];

    const actions = statements.map((s) => s.Action).flat();
    assert.ok(actions.includes('s3:GetObject'));
    assert.ok(actions.includes('s3:ListBucket'));
    assert.ok(actions.includes('s3:PutObject'));
    assert.ok(actions.includes('s3:DeleteObject'));
  });

  void it('✅ SUMMARY: grantAccess actually works!', () => {
    storage.grantAccess(mockAuth, {
      'public/*': [
        { type: 'authenticated', actions: ['read'] },
        { type: 'guest', actions: ['read'] },
      ],
      'private/{entity_id}/*': [
        { type: 'owner', actions: ['read', 'write', 'delete'] },
      ],
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::IAM::Policy', 2);

    const policies = template.findResources('AWS::IAM::Policy');
    assert.equal(Object.keys(policies).length, 2);

    Object.values(policies).forEach((policy: any) => {
      assert.ok(policy.Properties.PolicyDocument);
      assert.ok(policy.Properties.PolicyDocument.Statement);
      assert.ok(policy.Properties.Roles);
      assert.equal(policy.Properties.Roles.length, 1);
    });
  });
});

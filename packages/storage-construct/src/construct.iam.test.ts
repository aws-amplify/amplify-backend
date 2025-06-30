/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, it } from 'node:test';
import { AmplifyStorage } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';
import { StorageAccessOrchestrator } from './storage_access_orchestrator.js';
import { entityIdSubstitution } from './constants.js';
import assert from 'node:assert';

void describe('AmplifyStorage IAM Policy Tests', () => {
  let app: App;
  let stack: Stack;
  let storage: AmplifyStorage;
  let authRole: Role;
  let unauthRole: Role;
  let adminRole: Role;
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
    adminRole = new Role(stack, 'AdminRole', {
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
            case 'groups':
              role = rule.groups?.[0] === 'admin' ? adminRole : undefined;
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

  void it('creates IAM policy for authenticated read access', () => {
    storage.grantAccess(mockAuth, {
      'photos/*': [{ type: 'authenticated', actions: ['read'] }],
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::IAM::Policy', 1);

    const policies = template.findResources('AWS::IAM::Policy');
    const policy = policies[Object.keys(policies)[0]] as any;
    const statements = policy.Properties.PolicyDocument.Statement as any[];

    const getStatement = statements.find((s) => s.Action === 's3:GetObject');
    assert.ok(getStatement);
    assert.equal(getStatement.Effect, 'Allow');

    const listStatement = statements.find((s) => s.Action === 's3:ListBucket');
    assert.ok(listStatement);
    assert.equal(listStatement.Effect, 'Allow');

    assert.equal(policy.Properties.Roles.length, 1);
    assert.ok(policy.Properties.Roles[0].Ref.includes('AuthRole'));
  });

  void it('creates IAM policy for owner access with entity substitution', () => {
    storage.grantAccess(mockAuth, {
      'private/{entity_id}/*': [
        { type: 'owner', actions: ['read', 'write', 'delete'] },
      ],
    });

    const template = Template.fromStack(stack);
    const policies = template.findResources('AWS::IAM::Policy');
    const policy = policies[Object.keys(policies)[0]] as any;
    const statements = policy.Properties.PolicyDocument.Statement as any[];

    const policyStr = JSON.stringify(policy);
    assert.ok(policyStr.includes('${cognito-identity.amazonaws.com:sub}'));

    const actions = statements.map((s) => s.Action);
    assert.ok(actions.includes('s3:GetObject'));
    assert.ok(actions.includes('s3:ListBucket'));
    assert.ok(actions.includes('s3:PutObject'));
    assert.ok(actions.includes('s3:DeleteObject'));
  });

  void it('creates separate policies for different roles', () => {
    storage.grantAccess(mockAuth, {
      'public/*': [
        { type: 'authenticated', actions: ['read'] },
        { type: 'guest', actions: ['read'] },
      ],
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::IAM::Policy', 2);

    const policies = template.findResources('AWS::IAM::Policy');
    const policyValues = Object.values(policies) as any[];

    const roleRefs = policyValues.map((p) => p.Properties.Roles[0].Ref);
    assert.ok(roleRefs.some((ref) => ref.includes('AuthRole')));
    assert.ok(roleRefs.some((ref) => ref.includes('UnauthRole')));
  });

  void it('creates policy for group access', () => {
    storage.grantAccess(mockAuth, {
      'admin/*': [
        { type: 'groups', actions: ['read', 'write'], groups: ['admin'] },
      ],
    });

    const template = Template.fromStack(stack);

    const policies = template.findResources('AWS::IAM::Policy');
    const policy = policies[Object.keys(policies)[0]] as any;
    const statements = policy.Properties.PolicyDocument.Statement as any[];

    const actions = statements.map((s) => s.Action);
    assert.ok(actions.includes('s3:GetObject'));
    assert.ok(actions.includes('s3:ListBucket'));
    assert.ok(actions.includes('s3:PutObject'));

    assert.ok(policy.Properties.Roles[0].Ref.includes('AdminRole'));
  });

  void it('handles complex access scenarios', () => {
    storage.grantAccess(mockAuth, {
      'files/*': [{ type: 'authenticated', actions: ['read'] }],
      'files/private/*': [{ type: 'owner', actions: ['read', 'write'] }],
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::IAM::Policy', 1);

    const policies = template.findResources('AWS::IAM::Policy');
    const policy = policies[Object.keys(policies)[0]] as any;
    const statements = policy.Properties.PolicyDocument.Statement as any[];

    const allowStatements = statements.filter((s) => s.Effect === 'Allow');
    assert.ok(allowStatements.length > 0);
  });

  void it('optimizes policies by removing nested paths', () => {
    storage.grantAccess(mockAuth, {
      'docs/*': [{ type: 'authenticated', actions: ['read'] }],
      'docs/public/*': [{ type: 'authenticated', actions: ['read'] }],
    });

    const template = Template.fromStack(stack);

    const policies = template.findResources('AWS::IAM::Policy');
    const policy = policies[Object.keys(policies)[0]] as any;
    const statements = policy.Properties.PolicyDocument.Statement as any[];

    const getStatements = statements.filter((s) => s.Action === 's3:GetObject');
    assert.equal(getStatements.length, 1);
  });

  void it('handles all storage actions correctly', () => {
    storage.grantAccess(mockAuth, {
      'test/*': [
        { type: 'authenticated', actions: ['read', 'write', 'delete'] },
      ],
    });

    const template = Template.fromStack(stack);

    const policies = template.findResources('AWS::IAM::Policy');
    const policy = policies[Object.keys(policies)[0]] as any;
    const statements = policy.Properties.PolicyDocument.Statement as any[];

    const actions = statements.map((s) => s.Action);
    assert.ok(actions.includes('s3:GetObject'));
    assert.ok(actions.includes('s3:ListBucket'));
    assert.ok(actions.includes('s3:PutObject'));
    assert.ok(actions.includes('s3:DeleteObject'));
  });
});

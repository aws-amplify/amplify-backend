import { describe, it } from 'node:test';
import { AmplifyStorage, StorageAccessDefinition } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnIdentityPool, UserPool } from 'aws-cdk-lib/aws-cognito';

void describe('AmplifyStorage Phase 1 - Enhanced Props Interface', () => {
  void it('accepts direct access definition (L3 construct usage)', () => {
    const app = new App();
    const stack = new Stack(app);

    const directAccess: StorageAccessDefinition = {
      'public/*': [
        { type: 'guest', actions: ['read'] },
        { type: 'authenticated', actions: ['read', 'write'] },
      ],
      'private/{owner}/*': [
        { type: 'owner', actions: ['read', 'write', 'delete'] },
      ],
    };

    const storage = new AmplifyStorage(stack, 'Storage', {
      name: 'testStorage',
      access: directAccess,
    });

    assert.equal(storage.name, 'testStorage');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  void it('accepts factory callback access definition (backward compatibility)', () => {
    const app = new App();
    const stack = new Stack(app);

    const storage = new AmplifyStorage(stack, 'Storage', {
      name: 'testStorage',
      access: (allow) => ({
        'public/*': [allow.guest.to(['read'])],
      }),
    });

    assert.equal(storage.name, 'testStorage');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  void it('accepts direct Cognito resource references', () => {
    const app = new App();
    const stack = new Stack(app);

    const userPool = new UserPool(stack, 'UserPool');
    const identityPool = new CfnIdentityPool(stack, 'IdentityPool', {
      allowUnauthenticatedIdentities: true,
    });

    const storage = new AmplifyStorage(stack, 'Storage', {
      name: 'testStorage',
      userPool,
      identityPool,
    });

    assert.equal(storage.name, 'testStorage');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.resourceCountIs('AWS::Cognito::IdentityPool', 1);
  });

  void it('accepts direct IFunction references for triggers', () => {
    const app = new App();
    const stack = new Stack(app);

    const triggerFunction = new Function(stack, 'TriggerFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline(
        'exports.handler = async () => console.log("triggered");',
      ),
    });

    const storage = new AmplifyStorage(stack, 'Storage', {
      name: 'testStorage',
      triggers: {
        onUpload: triggerFunction,
      },
    });

    assert.equal(storage.name, 'testStorage');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
    // Lambda function creates additional resources (IAM role, etc.)
    template.resourcePropertiesCountIs(
      'AWS::Lambda::Function',
      {
        Runtime: 'nodejs20.x',
      },
      1,
    );
  });

  void it('supports all enhanced props together', () => {
    const app = new App();
    const stack = new Stack(app);

    const userPool = new UserPool(stack, 'UserPool');
    const identityPool = new CfnIdentityPool(stack, 'IdentityPool', {
      allowUnauthenticatedIdentities: true,
    });
    const triggerFunction = new Function(stack, 'TriggerFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline(
        'exports.handler = async () => console.log("triggered");',
      ),
    });

    const storage = new AmplifyStorage(stack, 'Storage', {
      name: 'testStorage',
      versioned: true,
      isDefault: true,
      access: {
        'public/*': [{ type: 'guest', actions: ['read'] }],
        'admin/*': [
          {
            type: 'groups',
            groups: ['Admins'],
            actions: ['read', 'write', 'delete'],
          },
        ],
      },
      userPool,
      identityPool,
      triggers: {
        onUpload: triggerFunction,
        onDelete: triggerFunction,
      },
    });

    assert.equal(storage.name, 'testStorage');
    assert.equal(storage.isDefault, true);

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.resourceCountIs('AWS::Cognito::IdentityPool', 1);
    // Lambda function creates additional resources (IAM role, etc.)
    template.resourcePropertiesCountIs(
      'AWS::Lambda::Function',
      {
        Runtime: 'nodejs20.x',
      },
      1,
    );

    // Verify versioning is enabled
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: { Status: 'Enabled' },
    });
  });
});

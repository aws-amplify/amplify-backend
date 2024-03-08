import { describe, it } from 'node:test';
import { App, NestedStack } from 'aws-cdk-lib';
import { AmplifyStack } from './amplify_stack.js';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { FederatedPrincipal, Role } from 'aws-cdk-lib/aws-iam';

void describe('AmplifyStack', () => {
  void it('renames nested stack logical IDs to non-redundant value', () => {
    const app = new App();
    const rootStack = new AmplifyStack(app, 'test-id');
    new NestedStack(rootStack, 'testName');

    const rootStackTemplate = Template.fromStack(rootStack);
    rootStackTemplate.resourceCountIs('AWS::CloudFormation::Stack', 1);
    const nestedStacks = rootStackTemplate.findResources(
      'AWS::CloudFormation::Stack'
    );
    const actualStackLogicalId = Object.keys(nestedStacks)[0]; // we already asserted there's only one
    assert.ok(actualStackLogicalId.startsWith('testName'));
    assert.ok(!actualStackLogicalId.includes('NestedStack'));
  });

  void it('allows roles with properly configured cognito trust policies', () => {
    const app = new App();
    const rootStack = new AmplifyStack(app, 'test-id');
    new Role(rootStack, 'correctRole', {
      assumedBy: new FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': 'testIdpId',
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });
    assert.doesNotThrow(() => Template.fromStack(rootStack));
  });

  void it('throws on roles with cognito trust policy missing amr condition', () => {
    const app = new App();
    const rootStack = new AmplifyStack(app, 'test-id');
    new Role(rootStack, 'missingAmrCondition', {
      assumedBy: new FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': 'testIdpId',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    assert.throws(() => Template.fromStack(rootStack), {
      message:
        'Cannot create a Role trust policy with Cognito that does not have a StringLike condition for cognito-identity.amazonaws.com:amr',
    });
  });

  void it('throws on roles with cognito trust policy missing aud condition', () => {
    const app = new App();
    const rootStack = new AmplifyStack(app, 'test-id');
    new Role(rootStack, 'missingAudCondition', {
      assumedBy: new FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    assert.throws(() => Template.fromStack(rootStack), {
      message:
        'Cannot create a Role trust policy with Cognito that does not have a StringEquals condition for cognito-identity.amazonaws.com:aud',
    });
  });
});

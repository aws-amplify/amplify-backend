import { describe, it } from 'node:test';
import { AmplifyAuth } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CfnUserPool, CfnUserPoolClient } from 'aws-cdk-lib/aws-cognito';

describe('Auth overrides', () => {
  it('can override case sensitivity', () => {
    const app = new App();
    const stack = new Stack(app);
    const auth = new AmplifyAuth(stack, 'test');
    const userPoolResource = auth.resources.userPool.node.findChild(
      'Resource'
    ) as CfnUserPool;
    userPoolResource.addPropertyOverride(
      'UsernameConfiguration.CaseSensitive',
      true
    );
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameConfiguration: {
        CaseSensitive: true,
      },
    });
  });
  it('can override setting to keep original attributes until verified', () => {
    const app = new App();
    const stack = new Stack(app);
    const auth = new AmplifyAuth(stack, 'test', { loginWith: { email: true } });
    const userPoolResource = auth.resources.userPool.node.findChild(
      'Resource'
    ) as CfnUserPool;
    userPoolResource.addPropertyOverride(
      'UserAttributeUpdateSettings.AttributesRequireVerificationBeforeUpdate',
      []
    );
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserAttributeUpdateSettings: {
        AttributesRequireVerificationBeforeUpdate: [],
      },
    });
  });
  it('can override password policy', () => {
    const app = new App();
    const stack = new Stack(app);
    const auth = new AmplifyAuth(stack, 'test');
    const userPoolResource = auth.resources.userPool.node.findChild(
      'Resource'
    ) as CfnUserPool;
    userPoolResource.addPropertyOverride(
      'Policies.PasswordPolicy.MinimumLength',
      10
    );
    userPoolResource.addPropertyOverride(
      'Policies.PasswordPolicy.RequireLowercase',
      false
    );
    userPoolResource.addPropertyOverride(
      'Policies.PasswordPolicy.RequireNumbers',
      false
    );
    userPoolResource.addPropertyOverride(
      'Policies.PasswordPolicy.RequireSymbols',
      false
    );
    userPoolResource.addPropertyOverride(
      'Policies.PasswordPolicy.RequireUppercase',
      false
    );
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Policies: {
        PasswordPolicy: {
          MinimumLength: 10,
          RequireLowercase: false,
          RequireNumbers: false,
          RequireSymbols: false,
          RequireUppercase: false,
        },
      },
    });
  });
  it('can override user existence errors', () => {
    const app = new App();
    const stack = new Stack(app);
    const auth = new AmplifyAuth(stack, 'test');
    const userPoolClientResource =
      auth.resources.userPoolClientWeb.node.findChild(
        'Resource'
      ) as CfnUserPoolClient;
    userPoolClientResource.addPropertyOverride(
      'PreventUserExistenceErrors',
      'LEGACY'
    );
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      PreventUserExistenceErrors: 'LEGACY',
    });
  });
  it('can override guest access setting', () => {
    const app = new App();
    const stack = new Stack(app);
    const auth = new AmplifyAuth(stack, 'test');
    auth.resources.cfnResources.identityPool.addPropertyOverride(
      'AllowUnauthenticatedIdentities',
      false
    );
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::IdentityPool', {
      AllowUnauthenticatedIdentities: false,
    });
  });
});

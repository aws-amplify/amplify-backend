import { describe, it } from 'node:test';
import { AmplifyAuth } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

describe.only('Auth construct defaults', () => {
  it('creates email login by default', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
    });
  });

  it('creates the correct number of default resources', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test');
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    template.resourceCountIs('AWS::Cognito::IdentityPool', 1);
    template.resourceCountIs('AWS::Cognito::IdentityPoolRoleAttachment', 1);
    template.resourceCountIs('AWS::IAM::Role', 2);
  });

  it('sets the case sensitivity to false', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameConfiguration: {
        CaseSensitive: false,
      },
    });
  });

  it('enables self signup', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: false,
      },
    });
  });

  it('prevents user existence errors', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      PreventUserExistenceErrors: 'ENABLED',
    });
  });

  it('sets the default password policy', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireLowercase: false,
          RequireNumbers: false,
          RequireSymbols: false,
          RequireUppercase: false,
        },
      },
    });
  });

  it('require verification of email before updating email', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserAttributeUpdateSettings: {
        AttributesRequireVerificationBeforeUpdate: ['email'],
      },
    });
  });

  it('enables SRP and Custom auth flows', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ExplicitAuthFlows: [
        'ALLOW_CUSTOM_AUTH',
        'ALLOW_USER_SRP_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ],
    });
  });

  it('creates a default client with cognito provider', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      SupportedIdentityProviders: ['COGNITO'],
    });
  });
});

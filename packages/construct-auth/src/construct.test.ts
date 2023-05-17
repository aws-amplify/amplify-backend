import { describe, it } from 'node:test';
import { Auth } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { UserPoolOperation } from 'aws-cdk-lib/aws-cognito';

describe('Auth construct', () => {
  it('creates case sensitive username login', () => {
    const app = new App();
    const stack = new Stack(app);
    new Auth(stack, 'test', {
      loginMechanisms: ['username'],
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameConfiguration: {
        CaseSensitive: true,
      },
    });
  });

  it('creates phone number login mechanism', () => {
    const app = new App();
    const stack = new Stack(app);
    new Auth(stack, 'test', {
      loginMechanisms: ['phone'],
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['phone_number'],
      AutoVerifiedAttributes: ['phone_number'],
    });
  });

  it('creates email login mechanism', () => {
    const app = new App();
    const stack = new Stack(app);
    new Auth(stack, 'test', {
      loginMechanisms: ['email'],
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
    });
  });

  it('does not allow username login with phone number or email', () => {
    const app = new App();
    const stack = new Stack(app);
    assert.throws(
      () =>
        new Auth(stack, 'test', {
          loginMechanisms: ['username', 'email'],
        }),
      /Username login mechanism cannot be used with phone or email login mechanisms/
    );

    assert.throws(
      () =>
        new Auth(stack, 'test2', {
          loginMechanisms: ['username', 'phone'],
        }),
      /Username login mechanism cannot be used with phone or email login mechanisms/
    );
  });

  it('creates google login mechanism', () => {
    const app = new App();
    const stack = new Stack(app);
    new Auth(stack, 'test', {
      loginMechanisms: [
        {
          provider: 'google',
          webClientId: 'testId',
          webClientSecret: 'testSecret',
        },
      ],
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
      ProviderName: 'Google',
      ProviderType: 'Google',
      ProviderDetails: {
        client_id: 'testId',
        client_secret: 'testSecret',
        authorize_scopes: 'profile',
      },
    });
  });
  it('attaches user pool trigger', () => {
    const app = new App();
    const stack = new Stack(app);
    const auth = new Auth(stack, 'test', {
      loginMechanisms: ['username'],
    });
    const func = new Function(stack, 'testFunc', {
      code: Code.fromInline('test code'),
      handler: 'test.handler',
      runtime: Runtime.NODEJS_18_X,
    });
    auth.setEventHandler(UserPoolOperation.PRE_AUTHENTICATION, func);
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    const handlerLogicalId = Object.keys(
      template.findResources('AWS::Lambda::Function')
    )[0];
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      LambdaConfig: {
        PreAuthentication: {
          'Fn::GetAtt': [handlerLogicalId, 'Arn'],
        },
      },
    });
  });
});

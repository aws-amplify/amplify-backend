import { describe, it, mock } from 'node:test';
import { AmplifyAuth } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import packageJson from '#package.json';

describe('Auth construct', () => {
  it('creates case sensitive username login', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
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
    new AmplifyAuth(stack, 'test', {
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
    new AmplifyAuth(stack, 'test', {
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
        new AmplifyAuth(stack, 'test', {
          loginMechanisms: ['username', 'email'],
        }),
      /Username login mechanism cannot be used with phone or email login mechanisms/
    );

    assert.throws(
      () =>
        new AmplifyAuth(stack, 'test2', {
          loginMechanisms: ['username', 'phone'],
        }),
      /Username login mechanism cannot be used with phone or email login mechanisms/
    );
  });

  it('creates google login mechanism', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
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

  describe('setAmplifyOutput', () => {
    it('stores outputs in platform', () => {
      const app = new App();
      const stack = new Stack(app);

      const storeOutputsMock = mock.fn();
      const stubOutputStorageStrategy = {
        storeOutputs: storeOutputsMock,
      };
      const authConstruct = new AmplifyAuth(stack, 'test', {
        loginMechanisms: ['username'],
      });

      authConstruct.setAmplifyOutput(stubOutputStorageStrategy);

      const storeOutputsArgs = storeOutputsMock.mock.calls[0].arguments;
      assert.equal(storeOutputsArgs.length, 3);
      assert.equal(storeOutputsArgs[0], packageJson.name);
      assert.equal(storeOutputsArgs[1], packageJson.version);
      assert.equal(Object.keys(storeOutputsArgs[2]).length, 1);
      assert.equal(Object.keys(storeOutputsArgs[2])[0], 'userPoolId');
    });
  });
});

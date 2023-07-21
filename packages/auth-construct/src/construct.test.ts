import { describe, it, mock } from 'node:test';
import { AmplifyAuth } from './construct.js';
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { authOutputKey } from '@aws-amplify/backend-output-schemas';

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
          webClientSecret: SecretValue.unsafePlainText('testSecret'),
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

  describe('storeOutput', () => {
    it('stores outputs in platform', () => {
      const app = new App();
      const stack = new Stack(app);

      const storeOutputMock = mock.fn();
      const stubBackendOutputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry> =
        {
          addBackendOutputEntry: storeOutputMock,
          flush: mock.fn(),
        };
      const authConstruct = new AmplifyAuth(stack, 'test', {
        loginMechanisms: ['username'],
      });

      const expectedUserPoolId = (
        authConstruct.node.findChild('UserPool') as UserPool
      ).userPoolId;
      const expectedWebClientId = (
        authConstruct.node.findChild('UserPoolWebClient') as UserPoolClient
      ).userPoolClientId;
      const expectedRegion = Stack.of(authConstruct).region;

      authConstruct.storeOutput(stubBackendOutputStorageStrategy);

      const storeOutputArgs = storeOutputMock.mock.calls[0].arguments;
      assert.equal(storeOutputArgs.length, 2);

      assert.deepStrictEqual(storeOutputArgs, [
        authOutputKey,
        {
          version: '1',
          payload: {
            userPoolId: expectedUserPoolId,
            webClientId: expectedWebClientId,
            authRegion: expectedRegion,
          },
        },
      ]);
    });
  });
});

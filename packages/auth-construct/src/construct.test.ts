import { describe, it, mock } from 'node:test';
import { AmplifyAuth } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { authOutputKey } from '@aws-amplify/backend-output-schemas';

describe('Auth construct', () => {
  it('creates phone number login mechanism', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', { phoneNumber: true });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['phone_number'],
      AutoVerifiedAttributes: ['phone_number'],
    });
  });

  it('creates email login mechanism', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', { email: true });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
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
        email: true,
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

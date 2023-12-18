import { describe, test } from 'node:test';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyAuth } from '@aws-amplify/auth-construct-alpha';
import { AmplifyPasswordlessAuth } from '../construct.js';
import { AmplifySignUpPasswordless } from './construct.js';

void describe('Passwordless Sign Up', () => {
  void test('Enable passwordless sign up', () => {
    const app = new App();
    const stack = new Stack(app);
    const auth = new AmplifyAuth(stack, 'testAuth', {
      loginWith: { email: true },
    });
    const authPasswordless = new AmplifyPasswordlessAuth(stack, 'test', auth, {
      magicLink: {
        allowedOrigins: [],
        email: { fromAddress: 'foo@example.com' },
      },
    });

    new AmplifySignUpPasswordless(
      stack,
      `signup-passwordless`,
      authPasswordless.verifyAuthChallengeResponse,
      auth.resources.userPool
    );

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Description: 'This service creates users.',
      Name: 'Create User service',
    });
    template.hasResourceProperties('AWS::ApiGateway::Stage', {
      StageName: 'prod',
    });
  });
});

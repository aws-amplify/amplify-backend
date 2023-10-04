import { describe, it } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AmplifyPasswordlessAuth } from './construct.js';
import { AmplifyAuth } from '@aws-amplify/auth-construct-alpha';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { throws } from 'node:assert';

void describe('Passwordless Auth construct', () => {
  const app = new App();
  const stack = new Stack(app);
  const auth = new AmplifyAuth(stack, 'testAuth', {
    loginWith: { email: true },
  });
  new AmplifyPasswordlessAuth(stack, 'test', auth, {
    magicLink: { enabled: true, sesFromAddress: 'foo@example.com' },
  });
  const template = Template.fromStack(stack);

  void it('Adds a Define Auth Challenge lambda', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      LambdaConfig: {
        DefineAuthChallenge: {
          'Fn::GetAtt': [Match.stringLikeRegexp('DefineAuthChallenge'), 'Arn'],
        },
      },
    });
  });

  void it('Adds a Create Auth Challenge lambda', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      LambdaConfig: {
        CreateAuthChallenge: {
          'Fn::GetAtt': [Match.stringLikeRegexp('CreateAuthChallenge'), 'Arn'],
        },
      },
    });
  });

  void it('Adds a Verify Auth Challenge lambda', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      LambdaConfig: {
        VerifyAuthChallengeResponse: {
          'Fn::GetAtt': [
            Match.stringLikeRegexp('VerifyAuthChallengeResponse'),
            'Arn',
          ],
        },
      },
    });
  });

  void it('throws if a custom auth trigger is added by the customer', () => {
    const app = new App();
    const stack = new Stack(app);
    const auth = new AmplifyAuth(stack, 'testAuth', {
      loginWith: { email: true },
    });
    const testFunc = new Function(stack, 'testFunc', {
      code: Code.fromInline('test code'),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_18_X,
    });
    auth.addTrigger('createAuthChallenge', testFunc);
    throws(() => {
      new AmplifyPasswordlessAuth(stack, 'test', auth, {
        magicLink: { enabled: true, sesFromAddress: 'foo@example.com' },
      });
    });
  });
});

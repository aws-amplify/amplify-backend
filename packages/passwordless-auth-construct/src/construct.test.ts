import { beforeEach, describe, it } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AmplifyPasswordlessAuth } from './construct.js';
import { AmplifyAuth } from '@aws-amplify/auth-construct-alpha';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { equal, notEqual, throws } from 'node:assert';
import { findPolicyResource } from './mocks/construct.js';

const mockOriginationNumber = '1234567890';

void describe('Passwordless Auth construct', () => {
  void describe('Triggers', () => {
    const app = new App();
    const stack = new Stack(app);
    const auth = new AmplifyAuth(stack, 'testAuth', {
      loginWith: { email: true },
    });
    new AmplifyPasswordlessAuth(stack, 'test', auth, {
      magicLink: {
        allowedOrigins: [],
        email: { fromAddress: 'foo@example.com' },
      },
    });
    const template = Template.fromStack(stack);
    const triggers = [
      'DefineAuthChallenge',
      'CreateAuthChallenge',
      'VerifyAuthChallengeResponse',
    ];

    triggers.forEach((trigger) => {
      void it(`Adds a ${trigger} lambda`, () => {
        template.hasResourceProperties('AWS::Cognito::UserPool', {
          LambdaConfig: {
            [trigger]: {
              'Fn::GetAtt': [Match.stringLikeRegexp(trigger), 'Arn'],
            },
          },
        });
      });
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
        magicLink: {
          allowedOrigins: [],
          email: { fromAddress: 'foo@example.com' },
        },
      });
    });
  });

  void describe('createAuthChallenge ses and sns policies', () => {
    const createAuthChallengeMatch = new RegExp(/CreateAuthChallenge/);

    const sesPolicy = {
      Action: 'ses:SendEmail',
      Effect: 'Allow',
      Resource: {
        'Fn::Join': [
          '',
          [
            'arn:',
            {
              Ref: 'AWS::Partition',
            },
            ':ses:',
            {
              Ref: 'AWS::Region',
            },
            ':',
            {
              Ref: 'AWS::AccountId',
            },
            ':identity/example.com',
          ],
        ],
      },
    };

    const snsPolicy = {
      Action: 'sns:publish',
      Effect: 'Allow',
      NotResource: 'arn:aws:sns:*:*:*',
    };

    let stack: Stack;
    let auth: AmplifyAuth;

    beforeEach(() => {
      const app = new App();
      stack = new Stack(app);
      const id = 'testAuth';
      auth = new AmplifyAuth(stack, id, {
        loginWith: { email: true },
      });
    });

    void it('should add ses policy only when OTP is enabled via email only', () => {
      new AmplifyPasswordlessAuth(stack, 'test', auth, {
        otp: {
          email: { fromAddress: 'foo@example.com' },
        },
      });
      const template = Template.fromStack(stack);
      const sesResource = findPolicyResource(
        template,
        createAuthChallengeMatch,
        sesPolicy
      );
      notEqual(sesResource, undefined);
      const snsResource = findPolicyResource(
        template,
        createAuthChallengeMatch,
        snsPolicy
      );
      equal(snsResource, undefined);
    });

    void it('should add ses policy only when Magic Link is enabled via email only', () => {
      new AmplifyPasswordlessAuth(stack, 'test', auth, {
        magicLink: {
          allowedOrigins: ['https://example.com'],
          email: { fromAddress: 'foo@example.com' },
        },
      });
      const template = Template.fromStack(stack);

      const sesResource = findPolicyResource(
        template,
        createAuthChallengeMatch,
        sesPolicy
      );
      notEqual(sesResource, undefined);
      const snsResource = findPolicyResource(
        template,
        createAuthChallengeMatch,
        snsPolicy
      );
      equal(snsResource, undefined);
    });

    void it('should add sns policy only when otp is enabled via SMS only', () => {
      new AmplifyPasswordlessAuth(stack, 'test', auth, {
        otp: {
          sms: {
            originationNumber: mockOriginationNumber,
          },
        },
      });
      const template = Template.fromStack(stack);
      const sesResource = findPolicyResource(
        template,
        createAuthChallengeMatch,
        sesPolicy
      );
      equal(sesResource, undefined);
      const snsResource = findPolicyResource(
        template,
        createAuthChallengeMatch,
        snsPolicy
      );
      notEqual(snsResource, undefined);
    });

    void it('should add sns + ses policies when otp is enabled via SMS and Email', () => {
      new AmplifyPasswordlessAuth(stack, 'test', auth, {
        otp: {
          sms: {
            originationNumber: mockOriginationNumber,
          },
          email: { fromAddress: 'foo@example.com' },
        },
      });
      const template = Template.fromStack(stack);
      const sesResource = findPolicyResource(
        template,
        createAuthChallengeMatch,
        sesPolicy
      );
      notEqual(sesResource, undefined);
      const snsResource = findPolicyResource(
        template,
        createAuthChallengeMatch,
        snsPolicy
      );
      notEqual(snsResource, undefined);
    });
  });
});

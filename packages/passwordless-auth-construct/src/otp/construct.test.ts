import { AmplifyAuth } from '@aws-amplify/auth-construct-alpha';
import { notEqual } from 'assert';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, it } from 'node:test';
import { AmplifyPasswordlessAuth } from '../construct.js';

void describe('Passwordless OTP construct', () => {
  const mockOriginationNumber = '1234567890';
  const mockSenderId = '123456';
  const mockOtpLength = 8;
  const app = new App();
  const stack = new Stack(app);
  const id = 'testAuth';
  const auth = new AmplifyAuth(stack, id, {
    loginWith: { email: true },
  });

  new AmplifyPasswordlessAuth(stack, 'test', auth, {
    otp: {
      length: mockOtpLength,
      sms: {
        originationNumber: mockOriginationNumber,
        senderId: mockSenderId,
      },
    },
  });
  const template = Template.fromStack(stack);

  void describe('otp', () => {
    void describe('environment variables', () => {
      void it(`Adds all options`, () => {
        const triggers = template.findResources('AWS::Lambda::Function', {
          Properties: {
            Environment: {
              Variables: {
                otpOriginationNumber: mockOriginationNumber,
                otpSenderId: mockSenderId,
                otpLength: mockOtpLength.toString(),
              },
            },
          },
        });
        const key =
          Object.keys(triggers).find((trigger) =>
            trigger.startsWith('CreateAuthChallenge')
          ) ?? '';
        const trigger = triggers[key];
        notEqual(trigger, undefined);
      });
    });
  });
});

import { AmplifyAuth } from '@aws-amplify/auth-construct-alpha';
import { equal } from 'assert';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, it } from 'node:test';
import { AmplifyPasswordlessAuth } from '../construct.js';
import { getLambdaEnvironmentVariables } from '../mocks/construct.js';

const createAuthChallengeMatch = new RegExp(/CreateAuthChallenge/);
const verifyAuthChallengeMatch = new RegExp(/VerifyAuthChallenge/);

void describe('Passwordless OTP construct', () => {
  const fromAddress = 'info@example.com';
  const subject = 'test subject';
  const body = 'test body';
  const mockOriginationNumber = '1234567890';
  const mockSenderId = '123456';
  const mockOtpLength = 8;
  const message = 'test message';
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
        message,
      },
      email: {
        fromAddress,
        subject,
        body,
      },
    },
  });
  const template = Template.fromStack(stack);

  void describe('otp', () => {
    void describe('environment variables', () => {
      void it(`should add appropriate environment variables to createAuthLambda`, () => {
        const envVars = getLambdaEnvironmentVariables(
          template,
          createAuthChallengeMatch
        );
        equal(envVars['otpEmailEnabled'], 'true');
        equal(envVars['otpSmsEnabled'], 'true');
        equal(envVars['otpFromAddress'], fromAddress);
        equal(envVars['otpSubject'], subject);
        equal(envVars['otpBody'], body);
        equal(envVars['otpOriginationNumber'], mockOriginationNumber);
        equal(envVars['otpSenderId'], mockSenderId);
        equal(envVars['otpLength'], mockOtpLength.toString());
        equal(envVars['otpSmsMessage'], message);
      });

      void it(`should add appropriate environment variables to verifyAuthLambda`, () => {
        const envVars = getLambdaEnvironmentVariables(
          template,
          verifyAuthChallengeMatch
        );
        equal(envVars['otpFromAddress'], undefined);
        equal(envVars['otpSubject'], undefined);
        equal(envVars['otpBody'], undefined);
        equal(envVars['otpOriginationNumber'], undefined);
        equal(envVars['otpSenderId'], undefined);
        equal(envVars['otpLength'], undefined);
        equal(envVars['otpSmsMessage'], undefined);
      });
    });
  });
});

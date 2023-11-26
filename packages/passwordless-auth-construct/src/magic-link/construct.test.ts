import { AmplifyAuth } from '@aws-amplify/auth-construct-alpha';
import { equal, notEqual } from 'assert';
import { App, Duration, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, it } from 'node:test';
import { AmplifyPasswordlessAuth } from '../construct.js';
import {
  findPolicyResource,
  getLambdaEnvironmentVariables,
} from '../mocks/construct.js';

const createAuthChallengeMatch = new RegExp(/CreateAuthChallenge/);
const verifyAuthChallengeMatch = new RegExp(/VerifyAuthChallenge/);

void describe('AmplifyMagicLinkAuth', () => {
  const fromAddress = 'info@example.com';
  const allowedOrigins = ['https://example.com'];
  const linkDuration = Duration.minutes(30);
  const app = new App();
  const stack = new Stack(app);
  const id = 'testAuth';
  const auth = new AmplifyAuth(stack, id, {
    loginWith: { email: true },
  });

  new AmplifyPasswordlessAuth(stack, 'test', auth, {
    magicLink: {
      allowedOrigins,
      linkDuration,
      email: {
        fromAddress,
      },
    },
  });
  const template = Template.fromStack(stack);

  void describe('policies', () => {
    void it('should add kms:Sign policy to createAuthChallenge lambda', () => {
      const resource = findPolicyResource(template, createAuthChallengeMatch, {
        Action: 'kms:Sign',
        Effect: 'Allow',
      });
      notEqual(resource, undefined);
    });

    void it('should not add kms:Sign policy to verifyAuthChallenge lambda', () => {
      const resource = findPolicyResource(template, verifyAuthChallengeMatch, {
        Action: 'kms:Sign',
        Effect: 'Allow',
      });
      equal(resource, undefined);
    });

    void it('should add kms:GetPublicKey policy to verifyAuthChallenge lambda', () => {
      const resource = findPolicyResource(template, verifyAuthChallengeMatch, {
        Action: 'kms:GetPublicKey',
        Effect: 'Allow',
      });
      notEqual(resource, undefined);
    });

    void it('should not add kms:GetPublicKey policy to createAuthChallenge lambda', () => {
      const resource = findPolicyResource(template, createAuthChallengeMatch, {
        Action: 'kms:GetPublicKey',
        Effect: 'Allow',
      });
      equal(resource, undefined);
    });

    void it('should add dynamodb:PutItem policy to createAuthChallenge lambda', () => {
      const resource = findPolicyResource(template, createAuthChallengeMatch, {
        Action: 'dynamodb:PutItem',
        Effect: 'Allow',
      });
      notEqual(resource, undefined);
    });

    void it('should not add dynamodb:PutItem policy to verifyAuthChallenge lambda', () => {
      const resource = findPolicyResource(template, verifyAuthChallengeMatch, {
        Action: 'dynamodb:PutItem',
        Effect: 'Allow',
      });
      equal(resource, undefined);
    });

    void it('should add dynamodb:DeleteItem policy to verifyAuthChallenge lambda', () => {
      const resource = findPolicyResource(template, verifyAuthChallengeMatch, {
        Action: 'dynamodb:DeleteItem',
        Effect: 'Allow',
      });
      notEqual(resource, undefined);
    });

    void it('should not add dynamodb:DeleteItem policy to createAuthChallenge lambda', () => {
      const resource = findPolicyResource(template, createAuthChallengeMatch, {
        Action: 'dynamodb:DeleteItem',
        Effect: 'Allow',
      });
      equal(resource, undefined);
    });
  });

  void describe('environment variables', () => {
    void it(`should add appropriate environment variables to createAuthLambda`, () => {
      const envVars = getLambdaEnvironmentVariables(
        template,
        createAuthChallengeMatch
      );
      equal(envVars['magicLinkFromAddress'], fromAddress);
      equal(envVars['magicLinkAllowedOrigins'], allowedOrigins[0]);
      equal(
        envVars['magicLinkSecondsUntilExpiry'],
        linkDuration.toSeconds().toString()
      );
      notEqual(envVars['magicLinkKmsKeyId'], undefined);
      notEqual(envVars['magicLinkTableName'], undefined);
    });

    void it(`should add appropriate environment variables to verifyAuthLambda`, () => {
      const envVars = getLambdaEnvironmentVariables(
        template,
        verifyAuthChallengeMatch
      );
      equal(envVars['magicLinkFromAddress'], undefined);
      equal(envVars['magicLinkAllowedOrigins'], undefined);
      equal(envVars['magicLinkSecondsUntilExpiry'], undefined);
      equal(envVars['magicLinkKmsKeyId'], undefined);
      notEqual(envVars['magicLinkTableName'], undefined);
    });
  });
});

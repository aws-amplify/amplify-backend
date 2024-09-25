import { describe, it } from 'node:test';
import { AmplifyReferenceAuth } from './index.js';
import { App, Stack } from 'aws-cdk-lib';

void describe('AmplifyConstruct', () => {
  void it('creates a queue if specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyReferenceAuth(stack, 'test', {
      authRoleArn:
        'arn:aws:cognito-idp:us-east-1:000000000000:userpool/us-east-1_IDSAMPLE1',
      unauthRoleArn:
        // eslint-disable-next-line spellcheck/spell-checker
        'arn:aws:cognito-identity:us-east-1:000000000000:identitypool/us-east-1:00000000-abcd-efgh-ijkl-000000000000',
      identityPoolId: 'identityPoolId',
      userPoolClientId: 'userPoolClientId',
      userPoolId: 'userPoolId',
    });
  });
});

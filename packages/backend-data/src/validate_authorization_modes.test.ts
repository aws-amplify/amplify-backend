import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { Stack } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { validateAuthorizationModes } from './validate_authorization_modes.js';

void describe('validateAuthorizationModes', () => {
  let stack: Stack;

  void beforeEach(() => {
    stack = new Stack();
  });

  void it('does not throw on well-formed input', () => {
    assert.doesNotThrow(() =>
      validateAuthorizationModes(undefined, {
        iamConfig: {
          identityPoolId: 'testIdentityPool',
          authenticatedUserRole: Role.fromRoleName(
            stack,
            'AuthUserRole',
            'MyAuthUserRole'
          ),
          unauthenticatedUserRole: Role.fromRoleName(
            stack,
            'UnauthUserRole',
            'MyUnauthUserRole'
          ),
          allowListedRoles: ['MyAdminRole'],
        },
      })
    );
  });

  void it('throws if no auth mode is configured', () => {
    assert.throws(
      () => validateAuthorizationModes(undefined, {}),
      /At least one authorization mode is required on the API. Either add Auth to the project to get IAM and UserPool authorization, or specify apiKeyConfig, lambdaConfig, or oidcConfig via authorization modes./
    );
  });
});

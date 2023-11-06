import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { Duration, Stack } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { validateAuthorizationModes } from './validate_authorization_modes.js';

void describe('validateAuthorizationModes', () => {
  let stack: Stack;

  void beforeEach(() => {
    stack = new Stack();
  });

  void it('does not throw on well-formed input', () => {
    assert.doesNotThrow(() =>
      validateAuthorizationModes(
        {
          allowListedRoleNames: ['MyAdminRole'],
        },
        {
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
        }
      )
    );
  });

  void it('throws if admin roles are specified and there is no iam auth configured', () => {
    assert.throws(
      () =>
        validateAuthorizationModes(
          {
            allowListedRoleNames: ['MyAdminRole'],
          },
          {
            apiKeyConfig: {
              expires: Duration.days(7),
            },
          }
        ),
      /Specifying allowListedRoleNames requires presence of IAM Authorization config. Auth must be added to the backend./
    );
  });

  void it('throws if no auth mode is configured', () => {
    assert.throws(
      () => validateAuthorizationModes(undefined, {}),
      /At least one authorization mode is required on the API. Either add Auth to the project to get IAM and UserPool authorization, or specify apiKeyConfig, lambdaConfig, or oidcConfig via authorization modes./
    );
  });
});

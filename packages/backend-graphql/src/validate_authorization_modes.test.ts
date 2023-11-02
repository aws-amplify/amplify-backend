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
      validateAuthorizationModes({
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
        },
        adminRoles: [Role.fromRoleName(stack, 'AdminRole', 'MyAdminRole')],
      })
    );
  });

  void it('throws if admin roles are specified and there is no iam auth configured', () => {
    assert.throws(
      () =>
        validateAuthorizationModes({
          adminRoles: [Role.fromRoleName(stack, 'AdminRole', 'MyAdminRole')],
        }),
      /Specifying adminRoleNames requires presence of IAM Authorization config. Either add Auth to the project, or specify an iamConfig in the authorizationModes./
    );
  });

  void it('throws if no auth mode is configured', () => {
    assert.throws(
      () => validateAuthorizationModes({}),
      /At least one authorization mode is required on the API. Either add Auth to the project to get IAM and UserPool authorization, or override the authorization modes specifying at least one auth mode./
    );
  });
});

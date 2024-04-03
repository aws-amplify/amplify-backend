import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { AmplifyFault, AmplifyUserError } from '@aws-amplify/platform-core';
import { AuthAction } from './types.js';

/**
 * Generates IAM policies scoped to a single userpool.
 */
export class UserPoolAccessPolicyFactory {
  private readonly namePrefix = 'userpoolAccess';
  private readonly stack: Stack;

  private policyCount = 1;

  /**
   * Instantiate with the userpool to generate policies for
   */
  constructor(private readonly userpool: IUserPool) {
    this.stack = Stack.of(userpool);
  }

  createPolicy = (actions: AuthAction[]) => {
    if (actions.length === 0) {
      throw new AmplifyUserError('EmptyPolicyError', {
        message: 'At least one action must be specified.',
        resolution:
          'Ensure all resource access rules specify at least one action.',
      });
    }

    const policyActions = new Set(
      actions.flatMap((action) => iamActionMap[action])
    );

    if (policyActions.size === 0) {
      throw new AmplifyFault('EmptyPolicyFault', {
        message: 'Failed to construct valid policy to access UserPool',
      });
    }

    const policy = new Policy(
      this.stack,
      `${this.namePrefix}${this.policyCount++}`,
      {
        statements: [
          new PolicyStatement({
            actions: [...policyActions],
            resources: [this.userpool.userPoolArn],
          }),
        ],
      }
    );

    return policy;
  };
}

type IamActionMap = {
  [action in AuthAction]: string[];
};

const iamActionMap: IamActionMap = {
  manageUsers: [
    'cognito-idp:AdminConfirmSignUp',
    'cognito-idp:AdminCreateUser',
    'cognito-idp:AdminDeleteUser',
    'cognito-idp:AdminDeleteUserAttributes',
    'cognito-idp:AdminDisableUser',
    'cognito-idp:AdminEnableUser',
    'cognito-idp:AdminGetUser',
    'cognito-idp:AdminListGroupsForUser',
    'cognito-idp:AdminRespondToAuthChallenge',
    'cognito-idp:AdminSetUserMFAPreference',
    'cognito-idp:AdminSetUserSettings',
    'cognito-idp:AdminUpdateUserAttributes',
    'cognito-idp:AdminUserGlobalSignOut',
  ],
  manageGroupMembership: [
    'cognito-idp:AdminAddUserToGroup',
    'cognito-idp:AdminRemoveUserFromGroup',
  ],
  manageGroups: [
    'cognito-idp:GetGroup',
    'cognito-idp:ListGroups',
    'cognito-idp:CreateGroup',
    'cognito-idp:DeleteGroup',
    'cognito-idp:UpdateGroup',
  ],
  manageUserDevices: [
    'cognito-idp:AdminForgetDevice',
    'cognito-idp:AdminGetDevice',
    'cognito-idp:AdminListDevices',
    'cognito-idp:AdminUpdateDeviceStatus',
  ],
  managePasswordRecovery: [
    'cognito-idp:AdminResetUserPassword',
    'cognito-idp:AdminSetUserPassword',
  ],
  addUserToGroup: ['cognito-idp:AdminAddUserToGroup'],
  createUser: ['cognito-idp:AdminCreateUser'],
  deleteUser: ['cognito-idp:AdminDeleteUser'],
  deleteUserAttributes: ['cognito-idp:AdminDeleteUserAttributes'],
  disableUser: ['cognito-idp:AdminDisableUser'],
  enableUser: ['cognito-idp:AdminEnableUser'],
  forgetDevice: ['cognito-idp:AdminForgetDevice'],
  getDevice: ['cognito-idp:AdminGetDevice'],
  getUser: ['cognito-idp:AdminGetUser'],
  listDevices: ['cognito-idp:AdminListDevices'],
  listGroupsForUser: ['cognito-idp:AdminListGroupsForUser'],
  removeUserFromGroup: ['cognito-idp:AdminRemoveUserFromGroup'],
  resetUserPassword: ['cognito-idp:AdminResetUserPassword'],
  setUserMfaPreference: ['cognito-idp:AdminSetUserMFAPreference'],
  setUserPassword: ['cognito-idp:AdminSetUserPassword'],
  setUserSettings: ['cognito-idp:AdminSetUserSettings'],
  updateDeviceStatus: ['cognito-idp:AdminUpdateDeviceStatus'],
  updateUserAttributes: ['cognito-idp:AdminUpdateUserAttributes'],
};

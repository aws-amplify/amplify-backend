import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { AmplifyFault } from '@aws-amplify/platform-core';
import { ActionIam, ActionMeta, AmplifyAuthActions } from './types.js';

/**
 * Generates IAM policies scoped to a single bucket
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

  createPolicy = (actions: AmplifyAuthActions) => {
    const policyActions: Set<string> = new Set();

    actions.forEach((authAction) => {
      const mappedAction = iamActionMap[authAction];

      if (typeof mappedAction === 'string') {
        policyActions.add(mappedAction);
      } else {
        mappedAction.forEach((action) => policyActions.add(action));
      }
    });

    if (policyActions.size === 0) {
      throw new AmplifyFault('EmptyPolicyFault', {
        message: 'At least one action must be specified',
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
  [action in ActionIam]: string;
} & {
  [amplifyActionSet in ActionMeta]: string[];
};

const iamActionMap: IamActionMap = {
  manageUser: [
    'cognito-idp:AdminAddUserToGroup',
    'cognito-idp:AdminConfirmSignUp',
    'cognito-idp:AdminCreateUser',
    'cognito-idp:AdminDeleteUser',
    'cognito-idp:AdminDeleteUserAttributes',
    'cognito-idp:AdminDisableUser',
    'cognito-idp:AdminEnableUser',
    'cognito-idp:AdminForgetDevice',
    'cognito-idp:AdminGetDevice',
    'cognito-idp:AdminGetUser',
    'cognito-idp:AdminListDevices',
    'cognito-idp:AdminListGroupsForUser',
    'cognito-idp:AdminListUserAuthEvents',
    'cognito-idp:AdminRemoveUserFromGroup',
    'cognito-idp:AdminResetUserPassword',
    'cognito-idp:AdminRespondToAuthChallenge',
    'cognito-idp:AdminSetUserMFAPreference',
    'cognito-idp:AdminSetUserPassword',
    'cognito-idp:AdminSetUserSettings',
    'cognito-idp:AdminUpdateDeviceStatus',
    'cognito-idp:AdminUpdateUserAttributes',
    'cognito-idp:AdminUserGlobalSignOut',
  ],
  addUserToGroup: 'cognito-idp:AdminAddUserToGroup',
  confirmSignUp: 'cognito-idp:AdminConfirmSignUp',
  createUser: 'cognito-idp:AdminCreateUser',
  deleteUser: 'cognito-idp:AdminDeleteUser',
  deleteUserAttributes: 'cognito-idp:AdminDeleteUserAttributes',
  disableUser: 'cognito-idp:AdminDisableUser',
  enableUser: 'cognito-idp:AdminEnableUser',
  forgetDevice: 'cognito-idp:AdminForgetDevice',
  getDevice: 'cognito-idp:AdminGetDevice',
  getUser: 'cognito-idp:AdminGetUser',
  listDevices: 'cognito-idp:AdminListDevices',
  listGroupsForUser: 'cognito-idp:AdminListGroupsForUser',
  listUserAuthEvents: 'cognito-idp:AdminListUserAuthEvents',
  removeUserFromGroup: 'cognito-idp:AdminRemoveUserFromGroup',
  resetUserPassword: 'cognito-idp:AdminResetUserPassword',
  respondToAuthChallenge: 'cognito-idp:AdminRespondToAuthChallenge',
  setUserMfaPreference: 'cognito-idp:AdminSetUserMFAPreference',
  setUserPassword: 'cognito-idp:AdminSetUserPassword',
  setUserSettings: 'cognito-idp:AdminSetUserSettings',
  updateDeviceStatus: 'cognito-idp:AdminUpdateDeviceStatus',
  updateUserAttributes: 'cognito-idp:AdminUpdateUserAttributes',
  userGlobalSignOut: 'cognito-idp:AdminUserGlobalSignOut',
};

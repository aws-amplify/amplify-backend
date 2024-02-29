import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { AmplifyFault } from '@aws-amplify/platform-core';
import { UserpoolAction } from './types.js';

export type Permission = {
  actions: UserpoolAction[];
  /**
   * An s3 prefix that defines the scope of the actions
   */
  resources: string[];
};

/**
 * Generates IAM policies scoped to a single bucket
 */
export class UserPoolAccessPolicyFactory {
  private readonly namePrefix = 'userpoolAccess';
  private readonly stack: Stack;

  private policyCount = 1;

  /**
   * Instantiate with the bucket to generate policies for
   */
  constructor(private readonly userpool: IUserPool) {
    this.stack = Stack.of(userpool);
  }

  createPolicy = (actions: Readonly<Set<UserpoolAction>>) => {
    if (actions.size === 0) {
      throw new AmplifyFault('EmptyPolicyFault', {
        message: 'At least one action must be specified',
      });
    }

    const statements: PolicyStatement[] = [];

    actions.forEach((action) => {
      statements.push(this.getStatement(action));
    });

    return new Policy(this.stack, `${this.namePrefix}${this.policyCount++}`, {
      statements,
    });
  };

  private getStatement = (action: UserpoolAction) =>
    new PolicyStatement({
      actions: actionPolicyMap[action],
      resources: [this.userpool.userPoolArn],
    });
}

const actionPolicyMap: Record<UserpoolAction, string[]> = {
  create: [
    'cognito-idp:ConfirmSignUp',
    'cognito-idp:AdminCreateUser',
    'cognito-idp:CreateUserImportJob',
    'cognito-idp:AdminSetUserSettings',
    'cognito-idp:AdminLinkProviderForUser',
    'cognito-idp:CreateIdentityProvider',
    'cognito-idp:AdminConfirmSignUp',
    'cognito-idp:AdminDisableUser',
    'cognito-idp:AdminRemoveUserFromGroup',
    'cognito-idp:SetUserMFAPreference',
    'cognito-idp:SetUICustomization',
    'cognito-idp:SignUp',
    'cognito-idp:VerifyUserAttribute',
    'cognito-idp:SetRiskConfiguration',
    'cognito-idp:StartUserImportJob',
    'cognito-idp:AdminSetUserPassword',
    'cognito-idp:AssociateSoftwareToken',
    'cognito-idp:CreateResourceServer',
    'cognito-idp:RespondToAuthChallenge',
    'cognito-idp:CreateUserPoolClient',
    'cognito-idp:AdminUserGlobalSignOut',
    'cognito-idp:GlobalSignOut',
    'cognito-idp:AddCustomAttributes',
    'cognito-idp:CreateGroup',
    'cognito-idp:CreateUserPool',
    'cognito-idp:AdminForgetDevice',
    'cognito-idp:AdminAddUserToGroup',
    'cognito-idp:AdminRespondToAuthChallenge',
    'cognito-idp:ForgetDevice',
    'cognito-idp:CreateUserPoolDomain',
    'cognito-idp:AdminEnableUser',
    'cognito-idp:AdminUpdateDeviceStatus',
    'cognito-idp:StopUserImportJob',
    'cognito-idp:InitiateAuth',
    'cognito-idp:AdminInitiateAuth',
    'cognito-idp:AdminSetUserMFAPreference',
    'cognito-idp:ConfirmForgotPassword',
    'cognito-idp:SetUserSettings',
    'cognito-idp:VerifySoftwareToken',
    'cognito-idp:AdminDisableProviderForUser',
    'cognito-idp:SetUserPoolMfaConfig',
    'cognito-idp:ChangePassword',
    'cognito-idp:ConfirmDevice',
    'cognito-idp:AdminResetUserPassword',
    'cognito-idp:ResendConfirmationCode',
  ],
  update: [
    'cognito-idp:ForgotPassword',
    'cognito-idp:UpdateAuthEventFeedback',
    'cognito-idp:UpdateResourceServer',
    'cognito-idp:UpdateUserPoolClient',
    'cognito-idp:AdminUpdateUserAttributes',
    'cognito-idp:UpdateUserAttributes',
    'cognito-idp:UpdateUserPoolDomain',
    'cognito-idp:UpdateIdentityProvider',
    'cognito-idp:UpdateGroup',
    'cognito-idp:AdminUpdateAuthEventFeedback',
    'cognito-idp:UpdateDeviceStatus',
    'cognito-idp:UpdateUserPool',
  ],
  read: [
    'cognito-identity:Describe*',
    'cognito-identity:Get*',
    'cognito-idp:Describe*',
    'cognito-idp:AdminGetDevice',
    'cognito-idp:AdminGetUser',
    'cognito-sync:Describe*',
    'cognito-sync:Get*',
  ],
  delete: [
    'cognito-idp:DeleteUserPoolDomain',
    'cognito-idp:DeleteResourceServer',
    'cognito-idp:DeleteGroup',
    'cognito-idp:AdminDeleteUserAttributes',
    'cognito-idp:DeleteUserPoolClient',
    'cognito-idp:DeleteUserAttributes',
    'cognito-idp:DeleteUserPool',
    'cognito-idp:AdminDeleteUser',
    'cognito-idp:DeleteIdentityProvider',
    'cognito-idp:DeleteUser',
  ],
  list: [
    'cognito-identity:List*',
    'cognito-idp:AdminList*',
    'cognito-idp:List*',
    'cognito-sync:List*',
    'iam:ListOpenIdConnectProviders',
    'iam:ListRoles',
    'sns:ListPlatformApplications',
  ],
};

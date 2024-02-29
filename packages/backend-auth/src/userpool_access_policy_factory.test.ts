import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { UserPoolAccessPolicyFactory } from './userpool_access_policy_factory.js';
import { Template } from 'aws-cdk-lib/assertions';
import { AccountPrincipal, Policy, Role } from 'aws-cdk-lib/aws-iam';

void describe('UserPoolAccessPolicyFactory', () => {
  let userpool: UserPool;
  let stack: Stack;
  let factory: UserPoolAccessPolicyFactory;

  beforeEach(() => {
    ({ stack, userpool } = createStackAndUserpool());
    factory = new UserPoolAccessPolicyFactory(userpool);
  });

  void it('throws if no permissions are specified', () => {
    assert.throws(() => factory.createPolicy(new Set()));
  });

  void it('returns policy with read actions', () => {
    const policy = factory.createPolicy(new Set(['read']));

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') })
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(Stack.of(userpool));

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'cognito-identity:Describe*',
              'cognito-identity:Get*',
              'cognito-idp:Describe*',
              'cognito-idp:AdminGetDevice',
              'cognito-idp:AdminGetUser',
              'cognito-sync:Describe*',
              'cognito-sync:Get*',
            ],
            Resource: {
              'Fn::GetAtt': ['testUserpool0DDFA854', 'Arn'],
            },
          },
        ],
      },
    });
  });

  void it('returns policy with create actions', () => {
    const policy = factory.createPolicy(new Set(['create']));

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') })
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(Stack.of(userpool));

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
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
            Resource: {
              'Fn::GetAtt': ['testUserpool0DDFA854', 'Arn'],
            },
          },
        ],
      },
    });
  });

  void it('returns policy with update actions', () => {
    const policy = factory.createPolicy(new Set(['update']));

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') })
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(Stack.of(userpool));

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
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
            Resource: {
              'Fn::GetAtt': ['testUserpool0DDFA854', 'Arn'],
            },
          },
        ],
      },
    });
  });

  void it('returns policy with delete actions', () => {
    const policy = factory.createPolicy(new Set(['delete']));

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') })
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(Stack.of(userpool));

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
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
            Resource: {
              'Fn::GetAtt': ['testUserpool0DDFA854', 'Arn'],
            },
          },
        ],
      },
    });
  });

  void it('returns policy with list actions', () => {
    const policy = factory.createPolicy(new Set(['list']));

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') })
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(Stack.of(userpool));

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'cognito-identity:List*',
              'cognito-idp:AdminList*',
              'cognito-idp:List*',
              'cognito-sync:List*',
              'iam:ListOpenIdConnectProviders',
              'iam:ListRoles',
              'sns:ListPlatformApplications',
            ],
            Resource: {
              'Fn::GetAtt': ['testUserpool0DDFA854', 'Arn'],
            },
          },
        ],
      },
    });
  });
});

const createStackAndUserpool = (): { stack: Stack; userpool: UserPool } => {
  const app = new App();
  const stack = new Stack(app);
  return {
    stack,
    userpool: new UserPool(stack, 'testUserpool'),
  };
};

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
    assert.throws(() => factory.createPolicy([]));
  });

  void it('returns policy with specified iam actions', () => {
    const policy = factory.createPolicy([
      'createUser',
      'updateUserAttributes',
      'deleteUserAttributes',
    ]);

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
              'cognito-idp:AdminCreateUser',
              'cognito-idp:AdminUpdateUserAttributes',
              'cognito-idp:AdminDeleteUserAttributes',
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

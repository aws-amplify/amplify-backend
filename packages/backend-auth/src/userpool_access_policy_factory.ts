import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { AmplifyFault, AmplifyUserError } from '@aws-amplify/platform-core';
import { AuthAction } from './types.js';
import { iamActionMap } from './configuration/iam_actions.js';

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

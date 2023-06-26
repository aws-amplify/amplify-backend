import { IRole } from 'aws-cdk-lib/aws-iam';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';

/**
 * Auth L2 constructs and IDs that are passed between constructs.
 *
 * TBD if userPool and identityPoolId should be required
 */
export type AuthResources = {
  authenticatedUserIamRole: IRole;
  unauthenticatedUserIamRole: IRole;
  userPool?: IUserPool;
  identityPoolId?: string;
};

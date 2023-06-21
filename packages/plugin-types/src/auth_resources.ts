import { IRole } from 'aws-cdk-lib/aws-iam';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';

export type AuthResources = {
  authenticatedUserIamRole?: IRole;
  unauthenticatedUserIamRole?: IRole;
  userPool?: IUserPool;
  identityPoolId?: string;
};

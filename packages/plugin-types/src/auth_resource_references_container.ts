import { IRole } from 'aws-cdk-lib/aws-iam';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';

export type AuthResourceReferences = {
  authenticatedUserIamRole?: IRole;
  unauthenticatedUserIamRole?: IRole;
  userPool?: IUserPool;
  identityPoolId?: string;
};

export type AuthResourceReferencesContainer = {
  setAuthResourceReferences(
    authResourceReferences: AuthResourceReferences
  ): void;
  getAuthResourceReferences(): AuthResourceReferences;
};

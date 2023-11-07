import { IRole } from 'aws-cdk-lib/aws-iam';
import {
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
  CfnUserPool,
  CfnUserPoolClient,
  IUserPool,
  IUserPoolClient,
} from 'aws-cdk-lib/aws-cognito';

/**
 * Accessible Cfn resources from the Auth construct, which were generated during
 * initialization.
 */
export type AuthCfnResources = {
  /**
   * The generated CfnUserPool L1 resource.
   */
  userPool: CfnUserPool;
  /**
   * The generated CfnUserPoolClient L1 resource.
   */
  userPoolClient: CfnUserPoolClient;
  /**
   * The generated CfnIdentityPool L1 resource.
   */
  identityPool: CfnIdentityPool;
  /**
   * The generated CfnIdentityPoolRoleAttachment L1 resource.
   */
  identityPoolRoleAttachment: CfnIdentityPoolRoleAttachment;
};
/**
 * Auth L2 and L1 resources.
 */
export type AuthResources = {
  /**
   * The generated UserPool L2 Resource.
   */
  userPool: IUserPool;
  /**
   * The generated UserPoolClient L2 Resource.
   */
  userPoolClient: IUserPoolClient;
  /**
   * The generated auth role.
   */
  authenticatedUserIamRole: IRole;
  /**
   * The generated unauth role.
   */
  unauthenticatedUserIamRole: IRole;
  /**
   * L1 Cfn Resources, for when dipping down a level of abstraction is desirable.
   */
  cfnResources: AuthCfnResources;
};

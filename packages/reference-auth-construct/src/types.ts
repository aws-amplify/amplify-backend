import { AuthOutput } from '@aws-amplify/backend-output-schemas';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';

export type ReferenceAuthProps = {
  /**
   * @internal
   */
  outputStorageStrategy?: BackendOutputStorageStrategy<AuthOutput>;
  /**
   * Existing UserPool Id
   */
  userPoolId: string;
  /**
   * Existing IdentityPool Id
   */
  identityPoolId: string;
  /**
   * Existing UserPoolClient Id
   */
  userPoolClientId: string;
  /**
   * Existing AuthRole ARN
   */
  authRoleArn: string;
  /**
   * Existing UnauthRole ARN
   */
  unauthRoleArn: string;
  /**
   * A mapping of existing group names and their associated role ARNs
   * which can be used for group permissions.
   */
  groups?: {
    [groupName: string]: string;
  };
};

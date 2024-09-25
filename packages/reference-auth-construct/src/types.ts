import { AuthOutput } from '@aws-amplify/backend-output-schemas';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';

export type ReferenceAuthProps = {
  /**
   * @internal
   */
  outputStorageStrategy?: BackendOutputStorageStrategy<AuthOutput>;
  userPoolId: string;
  identityPoolId: string;
  userPoolClientId: string;
  authRoleArn: string;
  unauthRoleArn: string;
};

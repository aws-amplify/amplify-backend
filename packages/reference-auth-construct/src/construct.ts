import { Construct } from 'constructs';
import { Stack, aws_cognito, aws_iam } from 'aws-cdk-lib';
import {
  BackendOutputStorageStrategy,
  ReferenceAuthResources,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { AuthOutput, authOutputKey } from '@aws-amplify/backend-output-schemas';
import {
  AttributionMetadataStorage,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-output-storage';
import * as path from 'path';
import { ReferenceAuthProps } from './types';

const authStackType = 'auth-Cognito';
/**
 * Reference Auth construct for using external auth resources
 */
export class AmplifyReferenceAuth
  extends Construct
  implements ResourceProvider<ReferenceAuthResources>
{
  resources: ReferenceAuthResources;

  /**
   * Create a new AmplifyConstruct
   */
  constructor(scope: Construct, id: string, props: ReferenceAuthProps) {
    super(scope, id);

    this.resources = {
      userPool: aws_cognito.UserPool.fromUserPoolId(
        this,
        'UserPool',
        props.userPoolId
      ),
      userPoolClient: aws_cognito.UserPoolClient.fromUserPoolClientId(
        this,
        'UserPoolClient',
        props.userPoolClientId
      ),
      authenticatedUserIamRole: aws_iam.Role.fromRoleArn(
        this,
        'authenticatedUserRole',
        props.authRoleArn
      ),
      unauthenticatedUserIamRole: aws_iam.Role.fromRoleArn(
        this,
        'unauthenticatedUserRole',
        props.unauthRoleArn
      ),
      identityPoolId: props.identityPoolId,
    };

    this.storeOutput(props.outputStorageStrategy);
    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      authStackType,
      path.resolve(__dirname, '..', 'package.json')
    );
  }

  /**
   * Stores auth output using the provided strategy
   */
  private storeOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<AuthOutput> = new StackMetadataBackendOutputStorageStrategy(
      Stack.of(this)
    )
  ): void => {
    // these properties cannot be overwritten
    const output: AuthOutput['payload'] = {
      userPoolId: this.resources.userPool.userPoolId,
      webClientId: this.resources.userPoolClient.userPoolClientId,
      identityPoolId: this.resources.identityPoolId,
      authRegion: Stack.of(this).region,
    };
    outputStorageStrategy.addBackendOutputEntry(authOutputKey, {
      version: '1',
      payload: output,
    });
  };
}

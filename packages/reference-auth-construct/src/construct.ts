import { Construct } from 'constructs';
import {
  CustomResource,
  Duration,
  Stack,
  aws_cognito,
  aws_iam,
} from 'aws-cdk-lib';
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
import { ReferenceAuthProps } from './types.js';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { fileURLToPath } from 'url';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';

const REFERENCE_AUTH_CUSTOM_RESOURCE_PROVIDER_ID =
  'AmplifyRefAuthConfigCustomResourceProvider';
const REFERENCE_AUTH_CUSTOM_RESOURCE_ID = 'AmplifyRefAuthConfigCustomResource';
const RESOURCE_TYPE = 'Custom::AmplifyReferenceAuthConfigurationResource';
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const resourcesRoot = path.normalize(path.join(dirname, 'lambda'));
const configurationLambdaFilePath = path.join(
  resourcesRoot,
  'reference_auth_initializer.js'
);

const authStackType = 'auth-Cognito';
/**
 * Reference Auth construct for using external auth resources
 */
export class AmplifyReferenceAuth
  extends Construct
  implements ResourceProvider<ReferenceAuthResources>
{
  resources: ReferenceAuthResources;

  private configurationCustomResource: CustomResource;

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

    // custom resource provider
    const configurationLambda = new NodejsFunction(
      scope,
      `${REFERENCE_AUTH_CUSTOM_RESOURCE_PROVIDER_ID}Lambda`,
      {
        runtime: Runtime.NODEJS_18_X,
        timeout: Duration.seconds(10),
        entry: configurationLambdaFilePath,
        handler: 'handler',
      }
    );
    const provider = new Provider(
      scope,
      REFERENCE_AUTH_CUSTOM_RESOURCE_PROVIDER_ID,
      {
        onEventHandler: configurationLambda,
      }
    );
    // custom resource
    this.configurationCustomResource = new CustomResource(
      scope,
      REFERENCE_AUTH_CUSTOM_RESOURCE_ID,
      {
        serviceToken: provider.serviceToken,
        properties: {
          userPoolId: props.userPoolId,
          identityPoolId: props.identityPoolId,
          userPoolClientId: props.userPoolClientId,
          lastUpdated: Date.now(),
        },
        resourceType: RESOURCE_TYPE,
      }
    );

    this.storeOutput(props.outputStorageStrategy);
    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      authStackType,
      path.resolve(dirname, '..', 'package.json')
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

    output.allowUnauthenticatedIdentities =
      this.configurationCustomResource.getAttString(
        'allowUnauthenticatedIdentities'
      );

    outputStorageStrategy.addBackendOutputEntry(authOutputKey, {
      version: '1',
      payload: output,
    });
  };
}

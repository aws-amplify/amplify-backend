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
import {
  AttributionMetadataStorage,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-output-storage';
import { AuthOutput } from '@aws-amplify/backend-output-schemas';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Role } from 'aws-cdk-lib/aws-iam';
import { ReferenceAuthInitializerProps } from './lambda/reference_auth_initializer.js';
import { fileURLToPath } from 'node:url';
import { ReferenceAuthProps } from './reference_factory.js';

/**
 * Expected key that auth output is stored under - must match backend-output-schemas's authOutputKey
 */
export const authOutputKey = 'AWS::Amplify::Auth';

const REFERENCE_AUTH_CUSTOM_RESOURCE_PROVIDER_ID =
  'AmplifyRefAuthCustomResourceProvider';
const REFERENCE_AUTH_CUSTOM_RESOURCE_ID = 'AmplifyRefAuthCustomResource';
const RESOURCE_TYPE = 'Custom::AmplifyRefAuth';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const resourcesRoot = path.normalize(path.join(dirname, 'lambda'));
const refAuthLambdaFilePath = path.join(
  resourcesRoot,
  'reference_auth_initializer.js'
);

const authStackType = 'auth-Cognito';

/**
 * These properties are fetched by the custom resource and must be accounted for
 * in the final AuthOutput payload.
 */
export const OUTPUT_PROPERTIES_PROVIDED_BY_AUTH_CUSTOM_RESOURCE: (keyof AuthOutput['payload'])[] =
  [
    'allowUnauthenticatedIdentities',
    'signupAttributes',
    'usernameAttributes',
    'verificationMechanisms',
    'passwordPolicyMinLength',
    'passwordPolicyRequirements',
    'mfaConfiguration',
    'mfaTypes',
    'socialProviders',
    'oauthCognitoDomain',
    'oauthScope',
    'oauthRedirectSignIn',
    'oauthRedirectSignOut',
    'oauthResponseType',
    'oauthClientId',
  ];
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
      groups: {},
    };

    // mapping of existing group roles
    if (props.groups) {
      Object.entries(props.groups).forEach(([groupName, roleArn]) => {
        this.resources.groups[groupName] = {
          role: Role.fromRoleArn(this, `${groupName}GroupRole`, roleArn),
        };
      });
    }

    // custom resource lambda
    const refAuthLambda = new NodejsFunction(
      scope,
      `${REFERENCE_AUTH_CUSTOM_RESOURCE_PROVIDER_ID}Lambda`,
      {
        runtime: Runtime.NODEJS_18_X,
        timeout: Duration.seconds(10),
        entry: refAuthLambdaFilePath,
        handler: 'handler',
      }
    );
    // UserPool & UserPoolClient specific permissions
    refAuthLambda.grantPrincipal.addToPrincipalPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        actions: [
          'cognito-idp:DescribeUserPool',
          'cognito-idp:GetUserPoolMfaConfig',
          'cognito-idp:ListIdentityProviders',
          'cognito-idp:ListGroups',
          'cognito-idp:DescribeUserPoolClient',
        ],
        resources: [this.resources.userPool.userPoolArn],
      })
    );
    // IdentityPool specific permissions
    const stack = Stack.of(this);
    refAuthLambda.grantPrincipal.addToPrincipalPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        actions: [
          'cognito-identity:DescribeIdentityPool',
          'cognito-identity:GetIdentityPoolRoles',
        ],
        resources: [
          `arn:aws:cognito-identity:${stack.region}:${stack.account}:identitypool/${this.resources.identityPoolId}`,
        ],
      })
    );
    const provider = new Provider(
      scope,
      REFERENCE_AUTH_CUSTOM_RESOURCE_PROVIDER_ID,
      {
        onEventHandler: refAuthLambda,
      }
    );
    const initializerProps: ReferenceAuthInitializerProps = {
      userPoolId: props.userPoolId,
      identityPoolId: props.identityPoolId,
      userPoolClientId: props.userPoolClientId,
      authRoleArn: props.authRoleArn,
      unauthRoleArn: props.unauthRoleArn,
      groups: props.groups ?? {},
      region: Stack.of(this).region,
    };
    // custom resource
    this.configurationCustomResource = new CustomResource(
      scope,
      REFERENCE_AUTH_CUSTOM_RESOURCE_ID,
      {
        serviceToken: provider.serviceToken,
        properties: {
          ...initializerProps,
        },
        resourceType: RESOURCE_TYPE,
      }
    );

    this.storeOutput(props.outputStorageStrategy);
    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      authStackType,
      fileURLToPath(new URL('../package.json', import.meta.url))
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

    // assign cdk tokens which will be resolved during deployment
    for (const property of OUTPUT_PROPERTIES_PROVIDED_BY_AUTH_CUSTOM_RESOURCE) {
      output[property] =
        this.configurationCustomResource.getAttString(property);
    }

    outputStorageStrategy.addBackendOutputEntry(authOutputKey, {
      version: '1',
      payload: output,
    });
  };
}

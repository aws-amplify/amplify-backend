import { Construct } from 'constructs';
import {
  AuthResources,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlApiProps,
  AuthorizationModes,
  IAMAuthorizationConfig,
  UserPoolAuthorizationConfig,
} from '@aws-amplify/graphql-api-construct';
import { GraphqlOutput } from '@aws-amplify/backend-output-schemas';
import * as path from 'path';
import { DataProps } from './types.js';
import { convertSchemaToCDK } from './convert_schema.js';

/**
 * Singleton factory for AmplifyGraphqlApi constructs that can be used in Amplify project files
 */
class DataFactory implements ConstructFactory<AmplifyGraphqlApi> {
  private generator: ConstructContainerEntryGenerator;

  /**
   * Create a new AmplifyConstruct
   */
  constructor(
    private readonly props: DataProps,
    private readonly importStack = new Error().stack
  ) {}

  /**
   * Gets an instance of the Data construct
   */
  getInstance = ({
    constructContainer,
    outputStorageStrategy,
    importPathVerifier,
  }: ConstructFactoryGetInstanceProps): AmplifyGraphqlApi => {
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'data', 'resource'),
      'Amplify Data must be defined in amplify/data/resource.ts'
    );
    if (!this.generator) {
      let authResourceProvider: ResourceProvider<AuthResources> | undefined;
      // There doesn't seem to be a great way to check if the resource provider exists before invoking getInstance,
      // so wrapping this in a try-catch to handle the case where this isn't defined.
      try {
        authResourceProvider = constructContainer
          .getConstructFactory<ResourceProvider<AuthResources>>('AuthResources')
          .getInstance({
            constructContainer,
            outputStorageStrategy,
            importPathVerifier,
          });
      } catch (_) {
        /* No-op */
      }
      this.generator = new DataGenerator(
        this.props,
        authResourceProvider,
        outputStorageStrategy
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyGraphqlApi;
  };
}

class DataGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'data';
  private readonly defaultName = 'amplifyData';

  constructor(
    private readonly props: DataProps,
    private readonly authResources: ResourceProvider<AuthResources> | undefined,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<GraphqlOutput>
  ) {}

  generateContainerEntry = (scope: Construct) => {
    let iamConfig: IAMAuthorizationConfig | undefined = undefined;
    let defaultAuthorizationMode: AuthorizationModes['defaultAuthorizationMode'] =
      'AWS_IAM';
    if (
      this.authResources?.resources.authenticatedUserIamRole &&
      this.authResources.resources.unauthenticatedUserIamRole &&
      this.authResources.resources.cfnResources.identityPool.logicalId
    ) {
      iamConfig = {
        authenticatedUserRole:
          this.authResources.resources.authenticatedUserIamRole,
        unauthenticatedUserRole:
          this.authResources.resources.unauthenticatedUserIamRole,
        identityPoolId:
          this.authResources.resources.cfnResources.identityPool.logicalId,
      };
    }

    let userPoolConfig: UserPoolAuthorizationConfig | undefined = undefined;
    if (this.authResources?.resources.userPool) {
      userPoolConfig = {
        userPool: this.authResources.resources.userPool,
      };
      defaultAuthorizationMode = 'AMAZON_COGNITO_USER_POOLS';
    }

    const dataAuthorizationModes = this.props.authorizationModes || {};

    const authorizationModes: AuthorizationModes = {
      defaultAuthorizationMode,
      iamConfig,
      userPoolConfig,
      ...dataAuthorizationModes,
    };

    // TODO inject the construct with the functionNameMap
    const graphqlConstructProps: AmplifyGraphqlApiProps = {
      apiName: this.props.name,
      definition: convertSchemaToCDK(this.props.schema),
      authorizationModes,
      outputStorageStrategy: this.outputStorageStrategy,
    };
    return new AmplifyGraphqlApi(
      scope,
      this.defaultName,
      graphqlConstructProps
    );
  };
}

/**
 * Creates a factory that implements ConstructFactory<AmplifyGraphqlApi>
 */
export const defineData = (
  props: DataProps
): ConstructFactory<AmplifyGraphqlApi> =>
  new DataFactory(props, new Error().stack);

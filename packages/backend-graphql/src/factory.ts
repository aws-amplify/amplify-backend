import { Construct } from 'constructs';
import {
  AuthResources,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';
import { GraphqlOutput } from '@aws-amplify/backend-output-schemas';
import * as path from 'path';
import { DataProps } from './types.js';
import {
  ProvidedAuthResources,
  convertAuthorizationModesToCDK,
  isUsingDefaultApiKeyAuth,
} from './convert_authorization_modes.js';
import { convertSchemaToCDK } from './convert_schema.js';
import {
  FunctionInstanceProvider,
  buildConstructFactoryFunctionInstanceProvider,
  convertFunctionNameMapToCDK,
} from './convert_functions.js';

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
  getInstance = (
    props: ConstructFactoryGetInstanceProps
  ): AmplifyGraphqlApi => {
    props.importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'data', 'resource'),
      'Amplify Data must be defined in amplify/data/resource.ts'
    );
    if (!this.generator) {
      // There doesn't seem to be a great way to check if this exists w/o producing an exception, so we just wrap in a try catch.
      let authResourceProvider: ResourceProvider<AuthResources> | undefined =
        undefined;
      try {
        authResourceProvider = props.constructContainer
          .getConstructFactory<ResourceProvider<AuthResources>>('AuthResources')
          .getInstance(props);
      } catch (_) {
        /* No-op */
      }
      this.generator = new DataGenerator(
        this.props,
        buildConstructFactoryFunctionInstanceProvider(props),
        {
          ...(authResourceProvider?.resources?.userPool
            ? { userPool: authResourceProvider.resources.userPool }
            : {}),
          ...(authResourceProvider?.resources?.cfnResources?.identityPool
            ? {
                identityPoolId:
                  authResourceProvider.resources.cfnResources.identityPool.ref,
              }
            : {}),
          ...(authResourceProvider?.resources?.authenticatedUserIamRole
            ? {
                authenticatedUserIamRole:
                  authResourceProvider.resources.authenticatedUserIamRole,
              }
            : {}),
          ...(authResourceProvider?.resources?.unauthenticatedUserIamRole
            ? {
                unauthenticatedUserRole:
                  authResourceProvider.resources.unauthenticatedUserIamRole,
              }
            : {}),
        },
        props.outputStorageStrategy
      );
    }
    return props.constructContainer.getOrCompute(
      this.generator
    ) as AmplifyGraphqlApi;
  };
}

class DataGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'data';
  private readonly defaultName = 'amplifyData';

  constructor(
    private readonly props: DataProps,
    private readonly functionInstanceProvider: FunctionInstanceProvider,
    private readonly providedAuthResources: ProvidedAuthResources,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<GraphqlOutput>
  ) {}

  generateContainerEntry = (scope: Construct) => {
    return new AmplifyGraphqlApi(scope, this.defaultName, {
      apiName: this.props.name,
      definition: convertSchemaToCDK(this.props.schema),
      authorizationModes: convertAuthorizationModesToCDK(
        scope,
        this.functionInstanceProvider,
        this.providedAuthResources,
        this.props.authorizationModes
      ),
      ...(this.props.functions
        ? {
            functionNameMap: convertFunctionNameMapToCDK(
              this.functionInstanceProvider,
              this.props.functions
            ),
          }
        : {}),
      outputStorageStrategy: this.outputStorageStrategy,
      translationBehavior: {
        sandboxModeEnabled: isUsingDefaultApiKeyAuth(
          this.providedAuthResources,
          this.props.authorizationModes
        ),
      },
    });
  };
}

/**
 * Creates a factory that implements ConstructFactory<AmplifyGraphqlApi>
 */
export const defineData = (
  props: DataProps
): ConstructFactory<AmplifyGraphqlApi> =>
  new DataFactory(props, new Error().stack);

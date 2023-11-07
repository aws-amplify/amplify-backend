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
import { convertSchemaToCDK } from './convert_schema.js';
import {
  FunctionInstanceProvider,
  buildConstructFactoryFunctionInstanceProvider,
  convertFunctionNameMapToCDK,
} from './convert_functions.js';
import {
  ProvidedAuthConfig,
  buildConstructFactoryProvidedAuthConfig,
  convertAuthorizationModesToCDK,
  isUsingDefaultApiKeyAuth,
} from './convert_authorization_modes.js';
import { validateAuthorizationModes } from './validate_authorization_modes.js';

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
    const { constructContainer, outputStorageStrategy, importPathVerifier } =
      props;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'data', 'resource'),
      'Amplify Data must be defined in amplify/data/resource.ts'
    );
    if (!this.generator) {
      this.generator = new DataGenerator(
        this.props,
        buildConstructFactoryProvidedAuthConfig(
          props.constructContainer
            .getConstructFactory<ResourceProvider<AuthResources>>(
              'AuthResources'
            )
            ?.getInstance(props)
        ),
        buildConstructFactoryFunctionInstanceProvider(props),
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
    private readonly providedAuthConfig: ProvidedAuthConfig | undefined,
    private readonly functionInstanceProvider: FunctionInstanceProvider,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<GraphqlOutput>
  ) {}

  generateContainerEntry = (scope: Construct) => {
    const authorizationModes = convertAuthorizationModesToCDK(
      this.functionInstanceProvider,
      this.providedAuthConfig,
      this.props.authorizationModes
    );

    validateAuthorizationModes(
      this.props.authorizationModes,
      authorizationModes
    );

    const sandboxModeEnabled = isUsingDefaultApiKeyAuth(
      this.providedAuthConfig,
      this.props.authorizationModes
    );

    const functionNameMap = convertFunctionNameMapToCDK(
      this.functionInstanceProvider,
      this.props.functions ?? {}
    );

    return new AmplifyGraphqlApi(scope, this.defaultName, {
      apiName: this.props.name,
      definition: convertSchemaToCDK(this.props.schema),
      authorizationModes,
      outputStorageStrategy: this.outputStorageStrategy,
      functionNameMap,
      translationBehavior: { sandboxModeEnabled },
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

import { IConstruct } from 'constructs';
import {
  AuthResources,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import {
  AmplifyData,
  AmplifyDynamoDbTableWrapper,
  TranslationBehavior,
} from '@aws-amplify/data-construct';
import { GraphqlOutput } from '@aws-amplify/backend-output-schemas';
import * as path from 'path';
import { AmplifyDataError, DataProps } from './types.js';
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
import { AmplifyUserError, CDKContextKey } from '@aws-amplify/platform-core';
import { Aspects, IAspect } from 'aws-cdk-lib';

/**
 * Singleton factory for AmplifyGraphqlApi constructs that can be used in Amplify project files.
 *
 * Exported for testing purpose only & should NOT be exported out of the package.
 */
export class DataFactory implements ConstructFactory<AmplifyData> {
  // publicly accessible for testing purpose only.
  static factoryCount = 0;

  private generator: ConstructContainerEntryGenerator;

  /**
   * Create a new AmplifyConstruct
   */
  constructor(
    private readonly props: DataProps,
    private readonly importStack = new Error().stack
  ) {
    if (DataFactory.factoryCount > 0) {
      throw new AmplifyUserError('MultipleSingletonResourcesError', {
        message:
          'Multiple `defineData` calls are not allowed within an Amplify backend',
        resolution: 'Remove all but one `defineData` call',
      });
    }
    DataFactory.factoryCount++;
  }

  /**
   * Gets an instance of the Data construct
   */
  getInstance = (props: ConstructFactoryGetInstanceProps): AmplifyData => {
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
    return constructContainer.getOrCompute(this.generator) as AmplifyData;
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

  generateContainerEntry = ({ scope }: GenerateContainerEntryProps) => {
    let authorizationModes;

    try {
      authorizationModes = convertAuthorizationModesToCDK(
        this.functionInstanceProvider,
        this.providedAuthConfig,
        this.props.authorizationModes
      );
    } catch (error) {
      throw new AmplifyUserError<AmplifyDataError>(
        'InvalidSchemaAuthError',
        {
          message:
            error instanceof Error
              ? error.message
              : 'Cannot covert authorization modes',
        },
        error instanceof Error ? error : undefined
      );
    }

    try {
      validateAuthorizationModes(
        this.props.authorizationModes,
        authorizationModes
      );
    } catch (error) {
      throw new AmplifyUserError<AmplifyDataError>(
        'InvalidSchemaAuthError',
        {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to validate authorization modes',
        },
        error instanceof Error ? error : undefined
      );
    }

    const sandboxModeEnabled = isUsingDefaultApiKeyAuth(
      this.providedAuthConfig,
      this.props.authorizationModes
    );

    const functionNameMap = convertFunctionNameMapToCDK(
      this.functionInstanceProvider,
      this.props.functions ?? {}
    );

    let amplifyGraphqlDefinition;
    try {
      amplifyGraphqlDefinition = convertSchemaToCDK(this.props.schema);
    } catch (error) {
      throw new AmplifyUserError<AmplifyDataError>(
        'InvalidSchemaError',
        {
          message:
            error instanceof Error
              ? error.message
              : 'Cannot covert user schema',
        },
        error instanceof Error ? error : undefined
      );
    }
    const amplifyData = new AmplifyData(scope, this.defaultName, {
      apiName: this.props.name,
      definition: amplifyGraphqlDefinition,
      authorizationModes,
      outputStorageStrategy: this.outputStorageStrategy,
      functionNameMap,
      translationBehavior: { sandboxModeEnabled },
    });
    Aspects.of(amplifyData).add(new AllowDestructiveUpdatesChecker());
    return amplifyData;
  };
}

const DESTRUCTIVE_SCHEMA_UPDATES_ATTRIBUTE_NAME: keyof TranslationBehavior =
  'allowDestructiveGraphqlSchemaUpdates';
const REPLACE_TABLE_UPON_GSI_UPDATE_ATTRIBUTE_NAME: keyof TranslationBehavior =
  'replaceTableUponGsiUpdate';
/**
 * Aspect class to modify the amplify managed DynamoDB table
 * to allow destructive updates when sandbox deployment is detected
 */
class AllowDestructiveUpdatesChecker implements IAspect {
  public visit(scope: IConstruct): void {
    if (scope.node.tryGetContext(CDKContextKey.DEPLOYMENT_TYPE) === 'sandbox') {
      if (AmplifyDynamoDbTableWrapper.isAmplifyDynamoDbTableResource(scope)) {
        // These value setters are not exposed in the wrapper
        // Need to use the property override to escape the hatch
        scope.addPropertyOverride(
          DESTRUCTIVE_SCHEMA_UPDATES_ATTRIBUTE_NAME,
          true
        );
        scope.addPropertyOverride(
          REPLACE_TABLE_UPON_GSI_UPDATE_ATTRIBUTE_NAME,
          true
        );
      }
    }
  }
}

/**
 * Creates a factory that implements ConstructFactory<AmplifyGraphqlApi>
 */
export const defineData = (props: DataProps): ConstructFactory<AmplifyData> =>
  new DataFactory(props, new Error().stack);

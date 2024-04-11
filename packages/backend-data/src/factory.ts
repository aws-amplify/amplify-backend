import { IConstruct } from 'constructs';
import {
  AmplifyFunction,
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
  IAmplifyDataDefinition,
  TranslationBehavior,
} from '@aws-amplify/data-construct';
import { GraphqlOutput } from '@aws-amplify/backend-output-schemas';
import * as path from 'path';
import { AmplifyDataError, DataProps } from './types.js';
import {
  combineCDKSchemas,
  convertSchemaToCDK,
  isCombinedSchema,
  isDataSchema,
} from './convert_schema.js';
import { convertFunctionNameMapToCDK } from './convert_functions.js';
import {
  ProvidedAuthConfig,
  buildConstructFactoryProvidedAuthConfig,
  convertAuthorizationModesToCDK,
  isUsingDefaultApiKeyAuth,
} from './convert_authorization_modes.js';
import { validateAuthorizationModes } from './validate_authorization_modes.js';
import {
  AmplifyError,
  AmplifyUserError,
  CDKContextKey,
} from '@aws-amplify/platform-core';
import { Aspects, IAspect } from 'aws-cdk-lib';
import { convertJsResolverDefinition } from './convert_js_resolvers.js';
import { AppSyncPolicyGenerator } from './app_sync_policy_generator.js';
import {
  FunctionSchemaAccess,
  JsResolver,
} from '@aws-amplify/data-schema-types';

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
        props,
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
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<GraphqlOutput>
  ) {}

  generateContainerEntry = ({
    scope,
    ssmEnvironmentEntriesGenerator,
    backendSecretResolver,
    stableBackendIdentifiers,
  }: GenerateContainerEntryProps) => {
    const amplifyGraphqlDefinitions: IAmplifyDataDefinition[] = [];
    const schemasJsFunctions: JsResolver[] = [];
    const schemasFunctionSchemaAccess: FunctionSchemaAccess[] = [];
    let schemasLambdaFunctions: Record<
      string,
      ConstructFactory<AmplifyFunction>
    > = {};
    try {
      const schemas = isCombinedSchema(this.props.schema)
        ? this.props.schema.schemas
        : [this.props.schema];

      schemas.forEach((schema) => {
        if (isDataSchema(schema)) {
          const { jsFunctions, functionSchemaAccess, lambdaFunctions } =
            schema.transform();
          schemasJsFunctions.push(...jsFunctions);
          schemasFunctionSchemaAccess.push(...functionSchemaAccess);
          schemasLambdaFunctions = {
            ...schemasLambdaFunctions,
            ...lambdaFunctions,
          };
        }

        amplifyGraphqlDefinitions.push(
          convertSchemaToCDK(
            schema,
            backendSecretResolver,
            stableBackendIdentifiers
          )
        );
      });
    } catch (error) {
      throw new AmplifyUserError<AmplifyDataError>(
        'InvalidSchemaError',
        {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to parse schema definition.',
          resolution:
            'Check your data schema definition for syntax and type errors.',
        },
        error instanceof Error ? error : undefined
      );
    }

    let authorizationModes;
    try {
      authorizationModes = convertAuthorizationModesToCDK(
        this.getInstanceProps,
        this.providedAuthConfig,
        this.props.authorizationModes
      );
    } catch (error) {
      if (error instanceof AmplifyError) {
        throw error;
      }
      throw new AmplifyUserError<AmplifyDataError>(
        'InvalidSchemaAuthError',
        {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to parse authorization modes.',
          resolution: 'Ensure the auth rules on your schema are valid.',
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
          resolution: 'Ensure the auth rules on your schema are valid.',
        },
        error instanceof Error ? error : undefined
      );
    }
    const apiName = this.props.name ?? this.defaultName;

    const sandboxModeEnabled = isUsingDefaultApiKeyAuth(
      this.providedAuthConfig,
      this.props.authorizationModes
    );

    const propsFunctions = this.props.functions ?? {};

    const functionNameMap = convertFunctionNameMapToCDK(this.getInstanceProps, {
      ...propsFunctions,
      ...schemasLambdaFunctions,
    });
    let amplifyApi = undefined;

    try {
      amplifyApi = new AmplifyData(scope, this.defaultName, {
        apiName,
        definition: combineCDKSchemas(amplifyGraphqlDefinitions),
        authorizationModes,
        outputStorageStrategy: this.outputStorageStrategy,
        functionNameMap,
        translationBehavior: {
          sandboxModeEnabled,
          /**
           * The destructive updates should be always allowed in backend definition and not to be controlled on the IaC
           * The CI/CD check should take the responsibility to validate if any tables are being replaced and determine whether to execute the changeset
           */
          allowDestructiveGraphqlSchemaUpdates: true,
        },
      });
    } catch (error) {
      throw new AmplifyUserError(
        'AmplifyDataConstructInitializationError',
        {
          message: 'Failed to instantiate data construct',
          resolution: 'See the underlying error message for more details.',
        },
        error as Error
      );
    }

    /**;
     * Enable the table replacement upon GSI update
     * This is allowed in sandbox mode ONLY
     */
    const isSandboxDeployment =
      scope.node.tryGetContext(CDKContextKey.DEPLOYMENT_TYPE) === 'sandbox';
    if (isSandboxDeployment) {
      Aspects.of(amplifyApi).add(new ReplaceTableUponGsiUpdateOverrideAspect());
    }

    convertJsResolverDefinition(scope, amplifyApi, schemasJsFunctions);

    const ssmEnvironmentEntries =
      ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries({
        [`${apiName}_GRAPHQL_ENDPOINT`]:
          amplifyApi.resources.cfnResources.cfnGraphqlApi.attrGraphQlUrl,
      });

    const policyGenerator = new AppSyncPolicyGenerator(
      amplifyApi.resources.graphqlApi
    );

    schemasFunctionSchemaAccess.forEach((accessDefinition) => {
      const policy = policyGenerator.generateGraphqlAccessPolicy(
        accessDefinition.actions
      );
      accessDefinition.resourceProvider
        .getInstance(this.getInstanceProps)
        .getResourceAccessAcceptor()
        .acceptResourceAccess(policy, ssmEnvironmentEntries);
    });

    return amplifyApi;
  };
}

const REPLACE_TABLE_UPON_GSI_UPDATE_ATTRIBUTE_NAME: keyof TranslationBehavior =
  'replaceTableUponGsiUpdate';

/**
 * Aspect class to modify the amplify managed DynamoDB table
 * to allow table replacement upon GSI update
 */
class ReplaceTableUponGsiUpdateOverrideAspect implements IAspect {
  public visit(scope: IConstruct): void {
    if (AmplifyDynamoDbTableWrapper.isAmplifyDynamoDbTableResource(scope)) {
      // These value setters are not exposed in the wrapper
      // Need to use the property override to escape the hatch
      scope.addPropertyOverride(
        REPLACE_TABLE_UPON_GSI_UPDATE_ATTRIBUTE_NAME,
        true
      );
    }
  }
}

/**
 * Creates a factory that implements ConstructFactory<AmplifyGraphqlApi>
 */
export const defineData = (props: DataProps): ConstructFactory<AmplifyData> =>
  new DataFactory(props, new Error().stack);

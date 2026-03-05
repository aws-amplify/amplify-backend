import { IConstruct } from 'constructs';
import {
  AmplifyFunction,
  AmplifyResourceGroupName,
  AuthResources,
  BackendIdentifier,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  DeploymentType,
  GenerateContainerEntryProps,
  ReferenceAuthResources,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import {
  AmplifyData,
  AmplifyDynamoDbTableWrapper,
  IAmplifyDataDefinition,
  TranslationBehavior,
} from '@aws-amplify/data-construct';
import { GraphqlOutput } from '@aws-amplify/backend-output-schemas';
import { generateModelsSync } from '@aws-amplify/graphql-generator';
import * as path from 'path';
import { AmplifyDataError, DataProps } from './types.js';
import {
  ProviderConnectionConfig,
  combineCDKSchemas,
  convertSchemaToCDK,
  isCombinedSchema,
  isDataSchema,
  splitSchemasByTableMap,
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
  TagName,
} from '@aws-amplify/platform-core';
import { Aspects, IAspect, RemovalPolicy, Tags } from 'aws-cdk-lib';
import { convertJsResolverDefinition } from './convert_js_resolvers.js';
import { AppSyncPolicyGenerator } from './app_sync_policy_generator.js';
import {
  FunctionSchemaAccess,
  JsResolver,
} from '@aws-amplify/data-schema-types';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { convertLoggingOptionsToCDK } from './logging_options_parser.js';
import { isProvisionedProvider } from './providers/types.js';
import { AuroraProvider } from './providers/aurora_provider.js';
const modelIntrospectionSchemaKey = 'modelIntrospectionSchema.json';
const defaultName = 'amplifyData';

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
    private readonly importStack = new Error().stack,
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
    const {
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      resourceNameValidator,
    } = props;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'data', 'resource'),
      'Amplify Data must be defined in amplify/data/resource.ts',
    );
    if (this.props.name) {
      resourceNameValidator?.validate(this.props.name);
    }
    if (!this.generator) {
      this.generator = new DataGenerator(
        this.props,
        buildConstructFactoryProvidedAuthConfig(
          props.constructContainer
            .getConstructFactory<
              ResourceProvider<AuthResources | ReferenceAuthResources>
            >('AuthResources')
            ?.getInstance(props),
        ),
        props,
        outputStorageStrategy,
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyData;
  };
}

class DataGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName = 'data';
  private readonly name: string;

  constructor(
    private readonly props: DataProps,
    private readonly providedAuthConfig: ProvidedAuthConfig | undefined,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<GraphqlOutput>,
  ) {
    this.name = props.name ?? defaultName;
  }

  generateContainerEntry = ({
    scope,
    ssmEnvironmentEntriesGenerator,
    backendSecretResolver,
    stableBackendIdentifiers,
  }: GenerateContainerEntryProps) => {
    // Handle database provider provisioning and configuration
    let providerConnectionConfig: ProviderConnectionConfig | undefined;

    if (this.props.database?.provider) {
      const provider = this.props.database.provider;

      // Provision database if provider supports it
      if (isProvisionedProvider(provider) && provider.shouldProvision) {
        // For Aurora provider, create the CDK construct
        if (provider instanceof AuroraProvider) {
          // Build BackendIdentifier from CDK context. This is the same approach
          // used by singleton_construct_container.ts in @aws-amplify/backend,
          // but reconstructed here to avoid a circular dependency.
          const backendIdentifier: BackendIdentifier = {
            namespace: scope.node.getContext(CDKContextKey.BACKEND_NAMESPACE),
            name: scope.node.getContext(CDKContextKey.BACKEND_NAME),
            type: scope.node.getContext(
              CDKContextKey.DEPLOYMENT_TYPE,
            ) as DeploymentType,
          };
          provider.createConstruct(
            scope,
            `${this.name}AuroraCluster`,
            backendIdentifier,
          );
        }
      }

      // Get connection configuration from provider
      const connectionConfig = provider.getConnectionConfig();
      const vpcConfig = provider.getVpcConfig();

      // Convert to format expected by schema conversion
      if ('uri' in connectionConfig) {
        providerConnectionConfig = {
          connectionUri: connectionConfig.uri,
        };

        // Add VPC config if available
        if (vpcConfig) {
          // When natGateways=0, CDK creates no private subnets — only public
          // and isolated. The SQL Lambda must run in isolated subnets (which
          // have VPC endpoints for SSM access), so fall back to those.
          const subnets =
            vpcConfig.vpc.privateSubnets?.length > 0
              ? vpcConfig.vpc.privateSubnets
              : vpcConfig.vpc.isolatedSubnets;
          providerConnectionConfig.vpcConfig = {
            vpcId: vpcConfig.vpc.vpcId,
            securityGroupIds:
              vpcConfig.securityGroups?.map((sg) => sg.securityGroupId) || [],
            subnetAvailabilityZones:
              subnets?.map((subnet) => ({
                availabilityZone: subnet.availabilityZone,
                subnetId: subnet.subnetId,
              })) || [],
          };
        }
      }
    }

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

      const isSandboxDeployment =
        scope.node.tryGetContext(CDKContextKey.DEPLOYMENT_TYPE) === 'sandbox';

      // get the branch name and use the imported table map for that key
      // use the sandbox key when in sandbox deployment
      const amplifyBranchName = isSandboxDeployment
        ? 'sandbox'
        : scope.node.tryGetContext(CDKContextKey.BACKEND_NAME);
      // ensure all branch names are unique
      if (this.props.migratedAmplifyGen1DynamoDbTableMappings) {
        const branchNames = new Set<string>();
        for (const tableMap of this.props
          .migratedAmplifyGen1DynamoDbTableMappings) {
          if (branchNames.has(tableMap.branchName)) {
            throw new AmplifyUserError('DefineDataConfigurationError', {
              message:
                'Branch names must be unique in the migratedAmplifyGen1DynamoDbTableMappings',
              resolution: 'Ensure all branch names are unique',
            });
          }
          branchNames.add(tableMap.branchName);
        }
      }

      const tableMapForCurrentBranch = (
        this.props.migratedAmplifyGen1DynamoDbTableMappings ?? []
      ).find((tableMap) => tableMap.branchName === amplifyBranchName);
      const splitSchemas = splitSchemasByTableMap(
        schemas,
        tableMapForCurrentBranch,
      );

      splitSchemas.forEach(({ schema, importedTableName }) => {
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
            stableBackendIdentifiers,
            importedTableName,
            providerConnectionConfig,
          ),
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
        error instanceof Error ? error : undefined,
      );
    }

    let authorizationModes;
    try {
      authorizationModes = convertAuthorizationModesToCDK(
        this.getInstanceProps,
        this.providedAuthConfig,
        this.props.authorizationModes,
      );
    } catch (error) {
      if (AmplifyError.isAmplifyError(error)) {
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
        error instanceof Error ? error : undefined,
      );
    }

    try {
      validateAuthorizationModes(
        this.props.authorizationModes,
        authorizationModes,
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
        error instanceof Error ? error : undefined,
      );
    }

    const sandboxModeEnabled = isUsingDefaultApiKeyAuth(
      this.providedAuthConfig,
      this.props.authorizationModes,
    );

    const propsFunctions = this.props.functions ?? {};

    const functionNameMap = convertFunctionNameMapToCDK(this.getInstanceProps, {
      ...propsFunctions,
      ...schemasLambdaFunctions,
    });
    let amplifyApi = undefined;
    let modelIntrospectionSchema: string | undefined = undefined;

    const isSandboxDeployment =
      scope.node.tryGetContext(CDKContextKey.DEPLOYMENT_TYPE) === 'sandbox';

    const cdkLoggingOptions = convertLoggingOptionsToCDK(
      this.props.logging ?? undefined,
    );

    try {
      const combinedSchema = combineCDKSchemas(amplifyGraphqlDefinitions);
      modelIntrospectionSchema = generateModelsSync({
        schema: combinedSchema.schema,
        target: 'introspection',
      })['model-introspection.json'];

      amplifyApi = new AmplifyData(scope, this.name, {
        apiName: this.name,
        definition: combinedSchema,
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
          _provisionHotswapFriendlyResources: isSandboxDeployment,
        },
        logging: cdkLoggingOptions,
      });
    } catch (error) {
      throw new AmplifyUserError(
        'AmplifyDataConstructInitializationError',
        {
          message: 'Failed to instantiate data construct',
          resolution: 'See the underlying error message for more details.',
        },
        error as Error,
      );
    }

    const modelIntrospectionSchemaBucket = new Bucket(
      scope,
      'modelIntrospectionSchemaBucket',
      {
        enforceSSL: true,
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY,
      },
    );
    new BucketDeployment(scope, 'modelIntrospectionSchemaBucketDeployment', {
      // See https://github.com/aws-amplify/amplify-category-api/pull/1939
      memoryLimit: 1536,
      destinationBucket: modelIntrospectionSchemaBucket,
      sources: [
        Source.data(modelIntrospectionSchemaKey, modelIntrospectionSchema),
      ],
    });

    Tags.of(amplifyApi).add(TagName.FRIENDLY_NAME, this.name);

    /**;
     * Enable the table replacement upon GSI update
     * This is allowed in sandbox mode ONLY
     */
    if (isSandboxDeployment) {
      Aspects.of(amplifyApi).add(new ReplaceTableUponGsiUpdateOverrideAspect());
    }

    convertJsResolverDefinition(scope, amplifyApi, schemasJsFunctions);

    const namePrefix = this.name === defaultName ? '' : defaultName;

    const ssmEnvironmentScopeContext = {
      [`${namePrefix}${this.name}_GRAPHQL_ENDPOINT`]:
        amplifyApi.resources.cfnResources.cfnGraphqlApi.attrGraphQlUrl,
      [`${namePrefix}${this.name}_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME`]:
        modelIntrospectionSchemaBucket.bucketName,
      [`${namePrefix}${this.name}_MODEL_INTROSPECTION_SCHEMA_KEY`]:
        modelIntrospectionSchemaKey,
      ['AMPLIFY_DATA_DEFAULT_NAME']: `${namePrefix}${this.name}`,
    };

    const backwardsCompatibleScopeContext =
      `${this.name}_GRAPHQL_ENDPOINT` !==
      `${namePrefix}${this.name}_GRAPHQL_ENDPOINT`
        ? {
            // @deprecated
            [`${this.name}_GRAPHQL_ENDPOINT`]:
              amplifyApi.resources.cfnResources.cfnGraphqlApi.attrGraphQlUrl,
          }
        : {};

    const ssmEnvironmentEntries =
      ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries({
        ...ssmEnvironmentScopeContext,
        ...backwardsCompatibleScopeContext,
      });

    const policyGenerator = new AppSyncPolicyGenerator(
      amplifyApi.resources.graphqlApi,
      `${modelIntrospectionSchemaBucket.bucketArn}/${modelIntrospectionSchemaKey}`,
    );

    schemasFunctionSchemaAccess.forEach((accessDefinition) => {
      const policy = policyGenerator.generateGraphqlAccessPolicy(
        accessDefinition.actions,
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
        true,
      );
    }
  }
}

/**
 * Creates a factory that implements ConstructFactory<AmplifyGraphqlApi>
 */
export const defineData = (props: DataProps): ConstructFactory<AmplifyData> =>
  new DataFactory(props, new Error().stack);

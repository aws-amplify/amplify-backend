import { Construct } from 'constructs';
import {
  AuthResources,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
} from '@aws-amplify/plugin-types';
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlApiProps,
  AuthorizationConfig,
} from '@aws-amplify/graphql-construct-alpha';
import { dataOutputKey } from '@aws-amplify/backend-output-schemas';
import { DataOutput } from '@aws-amplify/backend-output-schemas/data';

export type DataProps = Pick<AmplifyGraphqlApiProps, 'schema'>;

/**
 * Singleton factory for AmplifyGraphqlApi constructs that can be used in Amplify project files
 */
export class DataFactory implements ConstructFactory<AmplifyGraphqlApi> {
  private generator: ConstructContainerEntryGenerator;
  private readonly importStack: string | undefined;

  /**
   * Create a new AmplifyConstruct
   */
  constructor(private readonly props: DataProps) {
    this.importStack = new Error().stack;
  }

  /**
   * Gets an instance of the Data construct
   */
  getInstance({
    constructContainer,
    outputStorageStrategy,
    importPathVerifier,
  }: ConstructFactoryGetInstanceProps): AmplifyGraphqlApi {
    importPathVerifier?.verify(
      this.importStack,
      'data',
      'Amplify Data must be defined in a "data.ts" file'
    );
    if (!this.generator) {
      this.generator = new DataGenerator(
        this.props,
        constructContainer
          .getConstructFactory<AuthResources>('AuthResources')
          .getInstance({
            constructContainer,
            outputStorageStrategy,
            importPathVerifier,
          }),
        outputStorageStrategy
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyGraphqlApi;
  }
}

class DataGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'data';
  private readonly defaultName = 'amplifyData';

  constructor(
    private readonly props: DataProps,
    private readonly authResources: AuthResources,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<DataOutput>
  ) {}

  generateContainerEntry(scope: Construct) {
    const authConfig: AuthorizationConfig = {
      iamConfig: {
        authenticatedUserRole: this.authResources.authenticatedUserIamRole,
        unauthenticatedUserRole: this.authResources.unauthenticatedUserIamRole,
        identityPoolId: this.authResources.identityPoolId,
      },
    };

    if (this.authResources.userPool) {
      authConfig.userPoolConfig = {
        userPool: this.authResources.userPool,
      };
      authConfig.defaultAuthMode = 'AMAZON_COGNITO_USER_POOLS';
    }

    // TODO inject the construct with the functionNameMap
    const dataConstructProps: AmplifyGraphqlApiProps = {
      schema: this.props.schema,
      authorizationConfig: authConfig,
    };
    const dataConstruct = new AmplifyGraphqlApi(
      scope,
      this.defaultName,
      dataConstructProps
    );

    const dataOutput: DataOutput = {
      version: '1',
      payload: {
        appSyncApiEndpoint:
          dataConstruct.resources.cfnGraphqlApi.attrGraphQlUrl,
      },
    };

    if (dataConstruct.resources.cfnApiKey) {
      dataOutput.payload.appSyncApiKey =
        dataConstruct.resources.cfnApiKey?.attrApiKey;
    }

    this.outputStorageStrategy.addBackendOutputEntry(dataOutputKey, dataOutput);
    return dataConstruct;
  }
}

export const Data = DataFactory;

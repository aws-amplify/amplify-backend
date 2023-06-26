import { Construct } from 'constructs';
import {
  AuthResources,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructContainerEntryGenerator,
  ConstructFactory,
} from '@aws-amplify/plugin-types';
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlApiProps,
  AuthorizationConfig,
} from 'agqlac';
import {
  DataOutput,
  DataOutputType,
} from '@aws-amplify/backend-output-schemas';

export type DataProps = Pick<AmplifyGraphqlApiProps, 'schema'>;

/**
 * Singleton factory for AmplifyGraphqlApi constructs that can be used in Amplify project files
 */
export class DataFactory implements ConstructFactory<Construct> {
  private generator: ConstructContainerEntryGenerator;

  /**
   * Create a new AmplifyConstruct
   */
  constructor(private readonly props: DataProps) {}

  /**
   * Gets an instance of the Data construct
   */
  getInstance(
    container: ConstructContainer,
    outputStorageStrategy: BackendOutputStorageStrategy
  ): Construct {
    if (!this.generator) {
      this.generator = new DataGenerator(
        this.props,
        container
          .getConstructFactory<AuthResources>('AuthResources')
          .getInstance(container, outputStorageStrategy),
        outputStorageStrategy
      );
    }
    return container.getOrCompute(this.generator);
  }
}

class DataGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'data';
  private readonly defaultName = 'amplifyData';

  constructor(
    private readonly props: DataProps,
    private readonly authResources: AuthResources,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy
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

    const outputData: DataOutputType = {
      appSyncApiEndpoint: dataConstruct.resources.cfnGraphqlApi.attrGraphQlUrl,
    };

    if (dataConstruct.resources.cfnApiKey) {
      outputData.appSyncApiKey = dataConstruct.resources.cfnApiKey?.attrApiKey;
    }

    this.outputStorageStrategy.addBackendOutputEntry(
      DataOutput.fromDataOutput(outputData)
    );
    return dataConstruct;
  }
}

export const Data = DataFactory;

import { Construct } from 'constructs';
import {
  AuthResources,
  BackendOutputStorageStrategy,
  ConstructCache,
  ConstructCacheEntryGenerator,
  ConstructFactory,
} from '@aws-amplify/plugin-types';
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlApiProps,
  AuthorizationConfig,
} from 'agqlac';

export type DataProps = Pick<AmplifyGraphqlApiProps, 'schema'>;

/**
 * Singleton factory for AmplifyGraphqlApi constructs that can be used in Amplify project files
 */
export class DataFactory implements ConstructFactory<Construct> {
  private generator: ConstructCacheEntryGenerator;

  /**
   * Create a new AmplifyConstruct
   */
  constructor(private readonly props: DataProps) {}

  /**
   * Gets an instance of the Data construct
   */
  getInstance(
    cache: ConstructCache,
    outputStorageStrategy: BackendOutputStorageStrategy
  ): Construct {
    if (!this.generator) {
      this.generator = new DataGenerator(
        this.props,
        cache
          .getProviderFactory<AuthResources>('AuthResources')
          .getInstance(cache, outputStorageStrategy)
      );
    }
    return cache.getOrCompute(this.generator);
  }
}

class DataGenerator implements ConstructCacheEntryGenerator {
  readonly resourceGroupName: 'data';
  private readonly defaultName = 'amplifyData';

  constructor(
    private readonly props: DataProps,
    private readonly authResources: AuthResources
  ) {}

  generateCacheEntry(scope: Construct) {
    const authConfig: AuthorizationConfig = {
      iamConfig: {
        authRole: this.authResources.authenticatedUserIamRole,
        unauthRole: this.authResources.unauthenticatedUserIamRole,
        identityPoolId: this.authResources.identityPoolId,
      },
    };

    if (this.authResources.userPool) {
      authConfig.userPoolConfig = {
        userPool: this.authResources.userPool,
      };
    }

    // TODO will also need to inject the construct with some sort of function mapper but the construct doesn't accept this yet
    const dataConstructProps: AmplifyGraphqlApiProps = {
      schema: this.props.schema,
      authorizationConfig: authConfig,
    };
    const dataConstruct = new AmplifyGraphqlApi(
      scope,
      this.defaultName,
      dataConstructProps
    );
    // TODO outputs will need to be wired here
    // this could either be done by the factory if the construct exposes all of the outputs, or the construct could expose a method to pass in the storage strategy
    return dataConstruct;
  }
}

export const Data = DataFactory;

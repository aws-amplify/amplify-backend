import { AmplifyAuth, AmplifyAuthProps } from '@aws-amplify/auth-construct';
import { Construct } from 'constructs';
import {
  BackendOutputStorageStrategy,
  ConstructCache,
  ConstructCacheEntryGenerator,
  ConstructFactory,
} from '@aws-amplify/plugin-types';

/**
 * Singleton factory for AmplifyAuth that can be used in `auth.ts` files
 */
export class AmplifyAuthFactory implements ConstructFactory<AmplifyAuth> {
  private generator: ConstructCacheEntryGenerator;

  // forcing update

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(private readonly props: AmplifyAuthProps) {}

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance(
    cache: ConstructCache,
    backendOutputStorageStrategy: BackendOutputStorageStrategy
  ): AmplifyAuth {
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(
        this.props,
        backendOutputStorageStrategy
      );
    }
    return cache.getOrCompute(this.generator) as AmplifyAuth;
  }
}

class AmplifyAuthGenerator implements ConstructCacheEntryGenerator {
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  constructor(
    private readonly props: AmplifyAuthProps,
    private readonly backendOutputStorageStrategy: BackendOutputStorageStrategy
  ) {}

  generateCacheEntry(scope: Construct) {
    const authConstruct = new AmplifyAuth(scope, this.defaultName, this.props);
    authConstruct.storeOutput(this.backendOutputStorageStrategy);
    return authConstruct;
  }
}

/**
 * Alias for AmplifyAuthFactory
 */
export const Auth = AmplifyAuthFactory;

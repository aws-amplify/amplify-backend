import { AmplifyAuth, AmplifyAuthProps } from '@aws-amplify/auth-construct';
import { Construct } from 'constructs';
import {
  AmplifyBackendPlatform,
  ConstructCache,
  ConstructCacheEntryGenerator,
  ConstructFactory,
} from '@aws-amplify/plugin-types';

/**
 * Singleton factory for AmplifyAuth that can be used in `auth.ts` files
 */
export class AmplifyAuthFactory implements ConstructFactory<AmplifyAuth> {
  private generator: ConstructCacheEntryGenerator;

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(private readonly props: AmplifyAuthProps) {}

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance(
    cache: ConstructCache,
    backendPlatform: AmplifyBackendPlatform
  ): AmplifyAuth {
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(this.props, backendPlatform);
    }
    return cache.getOrCompute(this.generator) as AmplifyAuth;
  }
}

class AmplifyAuthGenerator implements ConstructCacheEntryGenerator {
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  constructor(
    private readonly props: AmplifyAuthProps,
    private readonly backendPlatform: AmplifyBackendPlatform
  ) {}

  generateCacheEntry(scope: Construct) {
    return new AmplifyAuth(
      scope,
      this.defaultName,
      this.props,
      this.backendPlatform
    );
  }
}

/**
 * Alias for AmplifyAuthFactory
 */
export const Auth = AmplifyAuthFactory;

import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct';
import { Construct } from 'constructs';
import {
  ConstructCache,
  ConstructCacheEntryGenerator,
  ConstructFactory,
  OutputStorageStrategy,
} from '@aws-amplify/plugin-types';

/**
 * Singleton factory for AmplifyAuth that can be used in `auth.ts` files
 */
export class AmplifyAuthFactory implements ConstructFactory<AmplifyAuth> {
  private generator: ConstructCacheEntryGenerator;

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(private readonly props: AuthProps) {}

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance(
    cache: ConstructCache,
    outputStorageStrategy: OutputStorageStrategy
  ): AmplifyAuth {
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(
        this.props,
        outputStorageStrategy
      );
    }
    return cache.getOrCompute(this.generator) as AmplifyAuth;
  }
}

class AmplifyAuthGenerator implements ConstructCacheEntryGenerator {
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  constructor(
    private readonly props: AuthProps,
    private readonly outputStorageStrategy: OutputStorageStrategy
  ) {}

  generateCacheEntry(scope: Construct) {
    return new AmplifyAuth(
      scope,
      this.defaultName,
      this.props,
      this.outputStorageStrategy
    );
  }
}

/**
 * Alias for AmplifyAuthFactory
 */
export const Auth = AmplifyAuthFactory;

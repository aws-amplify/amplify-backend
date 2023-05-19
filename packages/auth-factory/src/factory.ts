import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct';
import { Construct } from 'constructs';
import {
  ConstructCache,
  ConstructCacheEntryGenerator,
  ConstructFactory,
} from '@aws-amplify/plugin-types';

/**
 * Singleton factory for AmplifyAuth that can be used in `auth.ts` files
 */
export class AmplifyAuthFactory implements ConstructFactory<AmplifyAuth> {
  private readonly generator: ConstructCacheEntryGenerator;

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(private readonly props: AuthProps) {
    this.generator = new AmplifyAuthGenerator(props);
  }

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance(cache: ConstructCache): AmplifyAuth {
    return cache.getOrCompute(this.generator) as AmplifyAuth;
  }
}

class AmplifyAuthGenerator implements ConstructCacheEntryGenerator {
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  constructor(private readonly props: AuthProps) {}

  generateCacheEntry(scope: Construct) {
    return new AmplifyAuth(scope, this.defaultName, this.props);
  }
}

/**
 * Alias for AmplifyAuthFactory
 */
export const Auth = AmplifyAuthFactory;

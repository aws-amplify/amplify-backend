import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct';
import { Construct } from 'constructs';
import {
  ConstructCache,
  ConstructFactory,
  ConstructInitializer,
} from '@aws-amplify/plugin-types';

/**
 * Singleton factory for AmplifyAuth that can be used in `auth.ts` files
 */
export class AmplifyAuthFactory
  implements ConstructFactory<AmplifyAuth>, ConstructInitializer<AmplifyAuth>
{
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(private readonly props: AuthProps) {}

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance(cache: ConstructCache): AmplifyAuth {
    return cache.getOrCompute(this) as AmplifyAuth;
  }

  /**
   * Constructs a new AmplifyAuth in the given scope
   */
  initialize(scope: Construct): AmplifyAuth {
    return new AmplifyAuth(scope, this.defaultName, this.props);
  }
}

/**
 * Alias for AmplifyAuthFactory
 */
export const Auth = AmplifyAuthFactory;

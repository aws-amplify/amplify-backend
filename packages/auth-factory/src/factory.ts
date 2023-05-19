import {
  ConstructFactory,
  ConstructInitializer,
  ConstructResolver,
} from '@aws-amplify/backend-engine';
import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct';
import { Construct } from 'constructs';

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
  getInstance(resolver: ConstructResolver): AmplifyAuth {
    return resolver.resolve(this) as AmplifyAuth;
  }

  /**
   * Constructs a new AmplifyAuth in the given scope
   */
  initializeInScope(scope: Construct): AmplifyAuth {
    return new AmplifyAuth(scope, this.defaultName, this.props);
  }
}

/**
 * Alias for AmplifyAuthFactory
 */
export const Auth = AmplifyAuthFactory;

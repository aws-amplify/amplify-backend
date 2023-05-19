import {
  ConstructFactory,
  ConstructResolver,
  StackResolver,
} from '@aws-amplify/backend-engine';
import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct';

/**
 * Singleton factory for AmplifyAuth that can be used in `auth.ts` files
 */
export class AmplifyAuthFactory implements ConstructFactory<AmplifyAuth> {
  private static resourceGroupName: 'auth';
  private static defaultName: 'amplifyAuth';

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(private readonly props: AuthProps) {}

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance(resolver: ConstructResolver): AmplifyAuth {
    return resolver.resolve(
      AmplifyAuthFactory.defaultName,
      this.generatorFunction
    ) as AmplifyAuth;
  }

  private generatorFunction = (stackResolver: StackResolver): AmplifyAuth => {
    return new AmplifyAuth(
      stackResolver.getStackFor(AmplifyAuthFactory.resourceGroupName),
      AmplifyAuthFactory.defaultName,
      this.props
    );
  };
}

/**
 * Alias for AmplifyAuthFactory
 */
export const Auth = AmplifyAuthFactory;

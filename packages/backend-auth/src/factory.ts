import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct-alpha';
import { Construct } from 'constructs';
import {
  AuthResources,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';

/**
 * Singleton factory for AmplifyAuth that can be used in Amplify project files
 */
export class AmplifyAuthFactory
  implements ConstructFactory<AmplifyAuth & ResourceProvider<AuthResources>>
{
  readonly provides = 'AuthResources';
  private generator: ConstructContainerEntryGenerator;
  private readonly importStack: string | undefined;

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(private readonly props: AuthProps) {
    // capture the import stack in the ctor because this is what customers call in the backend definition code
    this.importStack = new Error().stack;
  }

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance = ({
    constructContainer,
    outputStorageStrategy,
    importPathVerifier,
  }: ConstructFactoryGetInstanceProps): AmplifyAuth => {
    importPathVerifier?.verify(
      this.importStack,
      'auth',
      'Amplify Auth must be defined in an "auth.ts" file'
    );
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(
        this.props,
        outputStorageStrategy
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyAuth;
  };
}

class AmplifyAuthGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  constructor(
    private readonly props: AuthProps,
    private readonly backendOutputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>
  ) {}

  generateContainerEntry = (scope: Construct) => {
    const authConstruct = new AmplifyAuth(scope, this.defaultName, this.props);
    authConstruct.storeOutput(this.backendOutputStorageStrategy);
    return authConstruct;
  };
}

/**
 * Alias for AmplifyAuthFactory
 */
export const Auth = AmplifyAuthFactory;

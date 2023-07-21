import {
  AmplifyAuth,
  AmplifyAuthProps,
} from '@aws-amplify/auth-construct-alpha';
import { Construct } from 'constructs';
import {
  AuthResources,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  BackendParameter,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  Replace,
} from '@aws-amplify/plugin-types';
import { SecretValue } from 'aws-cdk-lib';

export type AmplifyAuthFactoryProps = Replace<
  AmplifyAuthProps,
  SecretValue,
  BackendParameter
>;

/**
 * Singleton factory for AmplifyAuth that can be used in Amplify project files
 */
export class AmplifyAuthFactory
  implements ConstructFactory<AmplifyAuth & AuthResources>
{
  readonly provides = 'AuthResources';
  private generator: ConstructContainerEntryGenerator;
  private readonly importStack: string | undefined;

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(private readonly props: AmplifyAuthFactoryProps) {
    // capture the import stack in the ctor because this is what customers call in the backend definition code
    this.importStack = new Error().stack;
  }

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance({
    constructContainer,
    outputStorageStrategy,
    importPathVerifier,
    backendParameterResolver,
  }: ConstructFactoryGetInstanceProps): AmplifyAuth {
    importPathVerifier?.verify(
      this.importStack,
      'auth',
      'Amplify Auth must be defined in an "auth.ts" file'
    );
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(
        backendParameterResolver.resolveParameters(this.props),
        outputStorageStrategy
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyAuth;
  }
}

class AmplifyAuthGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  constructor(
    private readonly props: AmplifyAuthProps,
    private readonly backendOutputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>
  ) {}

  generateContainerEntry(scope: Construct) {
    const authConstruct = new AmplifyAuth(scope, this.defaultName, this.props);
    authConstruct.storeOutput(this.backendOutputStorageStrategy);
    return authConstruct;
  }
}

/**
 * Alias for AmplifyAuthFactory
 */
export const Auth = AmplifyAuthFactory;

import { AmplifyAuth, AmplifyAuthProps } from '@aws-amplify/auth-construct';
import { Construct } from 'constructs';
import {
  AuthResources,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructContainerEntryGenerator,
  ConstructFactory,
} from '@aws-amplify/plugin-types';

// to enforce a file convention structure, we check the import path of this module and fail if it does not match the expected convention
if (!import.meta.url.endsWith('auth.ts')) {
  if (!process.env.DISABLE_IMPORT_PATH_VERIFICATION) {
    throw new Error(`Amplify Auth must be defined in an 'auth.ts' file`);
  }
}
/**
 * Singleton factory for AmplifyAuth that can be used in Amplify project files
 */
export class AmplifyAuthFactory
  implements ConstructFactory<AmplifyAuth & AuthResources>
{
  readonly provides = 'AuthResources';
  private generator: ConstructContainerEntryGenerator;

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(private readonly props: AmplifyAuthProps) {}

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance(
    container: ConstructContainer,
    backendOutputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>
  ): AmplifyAuth {
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(
        this.props,
        backendOutputStorageStrategy
      );
    }
    return container.getOrCompute(this.generator) as AmplifyAuth;
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

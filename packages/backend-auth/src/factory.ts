import {
  AmplifyAuth,
  type AuthProps,
  type TriggerEvent,
} from '@aws-amplify/auth-construct-alpha';
import { type Construct } from 'constructs';
import {
  type AuthResources,
  type BackendSecretResolver,
  type ConstructContainerEntryGenerator,
  type ConstructFactory,
  type ConstructFactoryGetInstanceProps,
  type FunctionResources,
  type ResourceProvider,
} from '@aws-amplify/plugin-types';
import * as path from 'path';
import { type AuthLoginWithFactoryProps, type Expand } from './types.js';
import { translateToAuthConstructLoginWith } from './translate_auth_props.js';

export type AmplifyAuthProps = Expand<
  Omit<AuthProps, 'outputStorageStrategy' | 'loginWith'> & {
    /**
     * Specify how you would like users to log in. You can choose from email, phone, and even external providers such as LoginWithAmazon.
     */
    loginWith: Expand<AuthLoginWithFactoryProps>;
    /**
     * Configure custom auth triggers
     */
    triggers?: Partial<
      Record<
        TriggerEvent,
        ConstructFactory<ResourceProvider<FunctionResources>>
      >
    >;
  }
>;

/**
 * Singleton factory for AmplifyAuth that can be used in Amplify project files
 */
class AmplifyAuthFactory
  implements ConstructFactory<AmplifyAuth & ResourceProvider<AuthResources>>
{
  readonly provides = 'AuthResources';
  private generator: ConstructContainerEntryGenerator;

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(
    private readonly props: AmplifyAuthProps,
    private readonly importStack = new Error().stack
  ) {}

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps
  ): AmplifyAuth => {
    const { constructContainer, importPathVerifier } = getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'auth', 'resource'),
      'Amplify Auth must be defined in amplify/auth/resource.ts'
    );
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(this.props, getInstanceProps);
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyAuth;
  };
}

class AmplifyAuthGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  constructor(
    private readonly props: AmplifyAuthProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps
  ) {}

  generateContainerEntry = (
    scope: Construct,
    backendSecretResolver: BackendSecretResolver
  ) => {
    const authProps: AuthProps = {
      ...this.props,
      loginWith: translateToAuthConstructLoginWith(
        this.props.loginWith,
        backendSecretResolver
      ),
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
    };

    const authConstruct = new AmplifyAuth(scope, this.defaultName, authProps);
    Object.entries(this.props.triggers || {}).forEach(
      ([triggerEvent, handlerFactory]) => {
        authConstruct.addTrigger(
          triggerEvent as TriggerEvent, // this type assertion is necessary before .forEach types keys as just "string"
          handlerFactory.getInstance(this.getInstanceProps)
        );
      }
    );
    return authConstruct;
  };
}

/**
 * Provide the settings that will be used for authentication.
 */
export const defineAuth = (
  props: AmplifyAuthProps
): ConstructFactory<AmplifyAuth & ResourceProvider<AuthResources>> =>
  // Creates a factory that implements ConstructFactory<AmplifyAuth & ResourceProvider<AuthResources>>
  new AmplifyAuthFactory(props, new Error().stack);

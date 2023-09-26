import {
  AmplifyAuth,
  AuthProps,
  TriggerEvent,
} from '@aws-amplify/auth-construct-alpha';
import { Construct } from 'constructs';
import {
  AuthResources,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  ResourceProvider,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import {
  AuthFactoryLoginWith,
  translateToAuthConstructLoginWith,
} from './types.js';

export type TriggerConfig = {
  triggers?: Partial<
    Record<TriggerEvent, ConstructFactory<ResourceProvider<FunctionResources>>>
  >;
};

type ReplacedLoginWithAuthProps = Omit<AuthProps, 'loginWith'> & {
  loginWith: AuthFactoryLoginWith;
};

export type AmplifyAuthFactoryProps = Omit<
  ReplacedLoginWithAuthProps,
  'outputStorageStrategy'
> &
  TriggerConfig;

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
  constructor(private readonly props: AmplifyAuthFactoryProps) {
    // capture the import stack in the ctor because this is what customers call in the backend definition code
    this.importStack = new Error().stack;
  }

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps
  ): AmplifyAuth => {
    const { constructContainer, importPathVerifier, backendIdentifier } =
      getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      'auth',
      'Amplify Auth must be defined in an "auth.ts" file'
    );
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(
        this.props,
        getInstanceProps,
        backendIdentifier
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyAuth;
  };
}

class AmplifyAuthGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  constructor(
    private readonly props: AmplifyAuthFactoryProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly backendIdentifier: UniqueBackendIdentifier
  ) {}

  generateContainerEntry = (scope: Construct) => {
    const authProps: AuthProps = {
      ...this.props,
      loginWith: translateToAuthConstructLoginWith(
        scope,
        this.backendIdentifier,
        this.props.loginWith
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
 * Alias for AmplifyAuthFactory
 */
export const Auth = AmplifyAuthFactory;

import {
  AmplifyAuth,
  AuthProps,
  TriggerEvent,
} from '@aws-amplify/auth-construct-alpha';
import { Construct } from 'constructs';
import {
  AuthResources,
  BackendSecretResolver,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import * as path from 'path';
import { AuthLoginWithFactoryProps } from './types.js';
import { translateToAuthConstructLoginWith } from './translate_auth_props.js';

export type TriggerConfig = {
  /**
   * Specify Amazon Cognito triggers. Triggers are used to customize the functionality of your auth resource.
   * @see {@link https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html official Amazon Cognito triggers documentation}
   */
  triggers?: Partial<
    Record<TriggerEvent, ConstructFactory<ResourceProvider<FunctionResources>>>
  >;
};

export type AmplifyAuthFactoryProps = Omit<
  AuthProps,
  'outputStorageStrategy' | 'loginWith'
> &
  TriggerConfig & {
    /**
     * Specify how you would like users to log in, which can be email, phone, external providers such as LoginWithAmazon, etc.
     * @example <caption>with Email</caption>
     *          defineAuth({
     *            loginWith: {
     *              email: true,
     *            },
     *          })
     * @example <caption>with Phone</caption>
     *          defineAuth({
     *            loginWith: {
     *              phoneNumber: true,
     *            },
     *          })
     * @example <caption>with an external provider</caption>
     *          defineAuth({
     *            loginWith: {
     *              email: true,
     *              externalProvider: {
     *                loginWithAmazon: {
     *                  clientId: secret('LOGIN_WITH_AMAZON_CLIENT_ID'),
     *                  clientSecret: secret('LOGIN_WITH_AMAZON_CLIENT_SECRET'),
     *                },
     *              },
     *            },
     *          })
     */
    loginWith: AuthLoginWithFactoryProps;
  };

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
    private readonly props: AmplifyAuthFactoryProps,
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
    private readonly props: AmplifyAuthFactoryProps,
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
 * Define an auth resource. Auth resources use Amazon Cognito under the hood.
 * @todo link to Amplify (Gen 2) docs
 * @see {@link https://aws.amazon.com/cognito/ Amazon Cognito documentation}
 * @example <caption>Sample Usage</caption>
 *          defineAuth({
 *            loginWith: {
 *              email: true,
 *            },
 *          })
 */
export const defineAuth = (
  props: AmplifyAuthFactoryProps
): ConstructFactory<AmplifyAuth & ResourceProvider<AuthResources>> =>
  new AmplifyAuthFactory(props, new Error().stack);

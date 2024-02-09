import {
  AmplifyAuth,
  AmplifyAuthConstruct,
  AuthProps,
  TriggerEvent,
} from '@aws-amplify/auth-construct-alpha';
import {
  AuthRoleName,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  GenerateContainerEntryProps,
  ResourceAccessAcceptor,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import * as path from 'path';
import { AuthLoginWithFactoryProps, Expand } from './types.js';
import { translateToAuthConstructLoginWith } from './translate_auth_props.js';
import { Policy } from 'aws-cdk-lib/aws-iam';

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
  implements
    ConstructFactory<
      AmplifyAuthConstruct & ResourceAccessAcceptorFactory<AuthRoleName>
    >
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
  ): AmplifyAuthConstruct & ResourceAccessAcceptorFactory<AuthRoleName> => {
    const { constructContainer, importPathVerifier } = getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'auth', 'resource'),
      'Amplify Auth must be defined in amplify/auth/resource.ts'
    );
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(this.props, getInstanceProps);
    }
    return constructContainer.getOrCompute(
      this.generator
    ) as AmplifyAuthConstruct & ResourceAccessAcceptorFactory<AuthRoleName>;
  };
}

class AmplifyAuthGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  constructor(
    private readonly props: AmplifyAuthProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps
  ) {}

  generateContainerEntry = ({
    scope,
    backendSecretResolver,
  }: GenerateContainerEntryProps) => {
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

    const authConstructMixin: AmplifyAuthConstruct &
      ResourceAccessAcceptorFactory<AuthRoleName> = {
      ...authConstruct,
      getResourceAccessAcceptor: (
        roleName: AuthRoleName
      ): ResourceAccessAcceptor => ({
        acceptResourceAccess: (policy: Policy) => {
          const role = authConstruct.resources[roleName];
          policy.attachToRole(role);
        },
      }),
    };
    return authConstructMixin;
  };
}

/**
 * Provide the settings that will be used for authentication.
 */
export const defineAuth = (
  props: AmplifyAuthProps
): ConstructFactory<
  AmplifyAuthConstruct & ResourceAccessAcceptorFactory<AuthRoleName>
> => new AmplifyAuthFactory(props, new Error().stack);

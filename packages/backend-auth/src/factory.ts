import * as path from 'path';
import { Policy } from 'aws-cdk-lib/aws-iam';
import { UserPool, UserPoolOperation } from 'aws-cdk-lib/aws-cognito';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  AmplifyAuth,
  AuthProps,
  TriggerEvent,
} from '@aws-amplify/auth-construct-alpha';
import {
  AuthResources,
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
import { translateToAuthConstructLoginWith } from './translate_auth_props.js';
import { authAccessBuilder as _authAccessBuilder } from './access_builder.js';
import { AuthAccessPolicyArbiterFactory } from './auth_access_policy_arbiter.js';
import {
  AuthAccessGenerator,
  AuthLoginWithFactoryProps,
  Expand,
} from './types.js';
import { UserPoolAccessPolicyFactory } from './userpool_access_policy_factory.js';

export type BackendAuth = ResourceProvider<AuthResources> &
  ResourceAccessAcceptorFactory<AuthRoleName | string>;

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
    /**
     * !EXPERIMENTAL!
     *
     * Access control is under active development and is subject to change without notice.
     * Use at your own risk and do not use in production
     */
    access?: AuthAccessGenerator;
  }
>;

/**
 * Singleton factory for AmplifyAuth that can be used in Amplify project files.
 *
 * Exported for testing purpose only & should NOT be exported out of the package.
 */
export class AmplifyAuthFactory implements ConstructFactory<BackendAuth> {
  // publicly accessible for testing purpose only.
  static factoryCount = 0;

  readonly provides = 'AuthResources';

  private generator: ConstructContainerEntryGenerator;

  /**
   * Set the properties that will be used to initialize AmplifyAuth
   */
  constructor(
    private readonly props: AmplifyAuthProps,
    private readonly importStack = new Error().stack
  ) {
    if (AmplifyAuthFactory.factoryCount > 0) {
      throw new AmplifyUserError('MultipleSingletonResourcesError', {
        message:
          'Multiple `defineAuth` calls are not allowed within an Amplify backend',
        resolution: 'Remove all but one `defineAuth` call',
      });
    }
    AmplifyAuthFactory.factoryCount++;
  }

  /**
   * Get a singleton instance of AmplifyAuth
   */
  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps
  ): BackendAuth => {
    const { constructContainer, importPathVerifier } = getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'auth', 'resource'),
      'Amplify Auth must be defined in amplify/auth/resource.ts'
    );
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(this.props, getInstanceProps);
    }
    return constructContainer.getOrCompute(this.generator) as BackendAuth;
  };
}

class AmplifyAuthGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'auth';
  private readonly defaultName = 'amplifyAuth';

  constructor(
    private readonly props: AmplifyAuthProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly authAccessBuilder = _authAccessBuilder,
    private readonly authAccessPolicyArbiterFactory = new AuthAccessPolicyArbiterFactory()
  ) {}

  generateContainerEntry = ({
    scope,
    backendSecretResolver,
    ssmEnvironmentEntriesGenerator,
    stableBackendIdentifiers,
  }: GenerateContainerEntryProps) => {
    const authProps: AuthProps = {
      ...this.props,
      loginWith: translateToAuthConstructLoginWith(
        this.props.loginWith,
        backendSecretResolver
      ),
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
    };
    if (authProps.loginWith.externalProviders) {
      authProps.loginWith.externalProviders.domainPrefix =
        stableBackendIdentifiers.getStableBackendHash();
    }

    let authConstruct: AmplifyAuth;
    try {
      authConstruct = new AmplifyAuth(scope, this.defaultName, authProps);
    } catch (error) {
      throw new AmplifyUserError(
        'AmplifyAuthConstructInitializationError',
        {
          message: 'Failed to instantiate auth construct',
          resolution: 'See the underlying error message for more details.',
        },
        error as Error
      );
    }
    Object.entries(this.props.triggers || {}).forEach(
      ([triggerEvent, handlerFactory]) => {
        (authConstruct.resources.userPool as UserPool).addTrigger(
          UserPoolOperation.of(triggerEvent),
          handlerFactory.getInstance(this.getInstanceProps).resources.lambda
        );
      }
    );

    const authConstructMixin: BackendAuth = {
      ...authConstruct,
      /**
       * Returns a resourceAccessAcceptor for the given role
       * @param roleIdentifier Either the auth or unauth role name or the name of a UserPool group
       */
      getResourceAccessAcceptor: (
        roleIdentifier: AuthRoleName | string
      ): ResourceAccessAcceptor => ({
        identifier: `${roleIdentifier}ResourceAccessAcceptor`,
        acceptResourceAccess: (policy: Policy) => {
          const role = roleNameIsAuthRoleName(roleIdentifier)
            ? authConstruct.resources[roleIdentifier]
            : authConstruct.resources.groups?.[roleIdentifier]?.role;
          if (!role) {
            throw new AmplifyUserError('InvalidResourceAccessConfig', {
              message: `No auth IAM role found for "${roleIdentifier}".`,
              resolution: `If you are trying to configure UserPool group access, ensure that the group name is specified correctly.`,
            });
          }
          policy.attachToRole(role);
        },
      }),
    };
    if (!this.props.access) {
      return authConstructMixin;
    }
    // props.access is the access callback defined by the customer
    // here we inject the authAccessBuilder into the callback and run it
    // this produces the access definition that will be used to create the auth access policies
    const accessDefinition = this.props.access(this.authAccessBuilder);

    const ssmEnvironmentEntries =
      ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries({
        [`${this.defaultName}_USERPOOL_ID`]:
          authConstructMixin.resources.userPool.userPoolId,
      });

    const authPolicyArbiter = this.authAccessPolicyArbiterFactory.getInstance(
      accessDefinition,
      this.getInstanceProps,
      ssmEnvironmentEntries,
      new UserPoolAccessPolicyFactory(authConstruct.resources.userPool)
    );

    authPolicyArbiter.arbitratePolicies();

    return authConstructMixin;
  };
}

const roleNameIsAuthRoleName = (roleName: string): roleName is AuthRoleName => {
  return (
    roleName === 'authenticatedUserIamRole' ||
    roleName === 'unauthenticatedUserIamRole'
  );
};

/**
 * Provide the settings that will be used for authentication.
 */
export const defineAuth = (
  props: AmplifyAuthProps
): ConstructFactory<BackendAuth> =>
  new AmplifyAuthFactory(props, new Error().stack);

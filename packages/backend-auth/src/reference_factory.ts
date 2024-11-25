import {
  AmplifyResourceGroupName,
  AuthRoleName,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ReferenceAuthResources,
  ResourceAccessAcceptor,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
  StackProvider,
} from '@aws-amplify/plugin-types';
import { AuthAccessGenerator, Expand } from './types.js';
import { authAccessBuilder as _authAccessBuilder } from './access_builder.js';
import path from 'path';
import { AmplifyUserError, TagName } from '@aws-amplify/platform-core';
import { AuthAccessPolicyArbiterFactory } from './auth_access_policy_arbiter.js';
import { Stack, Tags } from 'aws-cdk-lib';
import { Policy } from 'aws-cdk-lib/aws-iam';
import { UserPoolAccessPolicyFactory } from './userpool_access_policy_factory.js';
import { AmplifyAuthFactory } from './factory.js';
import { AmplifyReferenceAuth } from './reference_construct.js';
import { AuthOutput } from '@aws-amplify/backend-output-schemas';

export type ReferenceAuthProps = {
  /**
   * @internal
   */
  outputStorageStrategy?: BackendOutputStorageStrategy<AuthOutput>;
  /**
   * Existing UserPool Id
   */
  userPoolId: string;
  /**
   * Existing IdentityPool Id
   */
  identityPoolId: string;
  /**
   * Existing UserPoolClient Id
   */
  userPoolClientId: string;
  /**
   * Existing AuthRole ARN
   */
  authRoleArn: string;
  /**
   * Existing UnauthRole ARN
   */
  unauthRoleArn: string;
  /**
   * A mapping of existing group names and their associated role ARNs
   * which can be used for group permissions.
   */
  groups?: {
    [groupName: string]: string;
  };
};

export type BackendReferenceAuth = ResourceProvider<ReferenceAuthResources> &
  ResourceAccessAcceptorFactory<AuthRoleName | string> &
  StackProvider;

export type AmplifyReferenceAuthProps = Expand<
  Omit<ReferenceAuthProps, 'outputStorageStrategy'> & {
    /**
     * Configure access to auth for other Amplify resources
     * @see https://docs.amplify.aws/react/build-a-backend/auth/grant-access-to-auth-resources/
     * @example
     * access: (allow) => [allow.resource(postConfirmation).to(["addUserToGroup"])]
     * @example
     * access: (allow) => [allow.resource(groupManager).to(["manageGroups"])]
     */
    access?: AuthAccessGenerator;
  }
>;
/**
 * Singleton factory for AmplifyReferenceAuth that can be used in Amplify project files.
 *
 * Exported for testing purpose only & should NOT be exported out of the package.
 */
export class AmplifyReferenceAuthFactory
  implements ConstructFactory<BackendReferenceAuth>
{
  readonly provides = 'AuthResources';

  private generator: ConstructContainerEntryGenerator;

  /**
   * Set the properties that will be used to initialize AmplifyReferenceAuth
   */
  constructor(
    private readonly props: AmplifyReferenceAuthProps,
    // eslint-disable-next-line amplify-backend-rules/prefer-amplify-errors
    private readonly importStack = new Error().stack
  ) {
    if (AmplifyAuthFactory.factoryCount > 0) {
      throw new AmplifyUserError('MultipleSingletonResourcesError', {
        message:
          'Multiple `defineAuth` or `referenceAuth` calls are not allowed within an Amplify backend',
        resolution: 'Remove all but one `defineAuth` or `referenceAuth` call',
      });
    }
    AmplifyAuthFactory.factoryCount++;
  }
  /**
   * Get a singleton instance of AmplifyReferenceAuth
   */
  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps
  ): BackendReferenceAuth => {
    const { constructContainer, importPathVerifier } = getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'auth', 'resource'),
      'Amplify Auth must be defined in amplify/auth/resource.ts'
    );
    if (!this.generator) {
      this.generator = new AmplifyReferenceAuthGenerator(
        this.props,
        getInstanceProps
      );
    }
    return constructContainer.getOrCompute(
      this.generator
    ) as BackendReferenceAuth;
  };
}
class AmplifyReferenceAuthGenerator
  implements ConstructContainerEntryGenerator
{
  readonly resourceGroupName: AmplifyResourceGroupName = 'auth';
  private readonly name: string;

  constructor(
    private readonly props: AmplifyReferenceAuthProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly authAccessBuilder = _authAccessBuilder,
    private readonly authAccessPolicyArbiterFactory = new AuthAccessPolicyArbiterFactory()
  ) {
    this.name = 'amplifyAuth';
  }

  generateContainerEntry = ({
    scope,
    ssmEnvironmentEntriesGenerator,
  }: GenerateContainerEntryProps) => {
    const authProps: ReferenceAuthProps = {
      ...this.props,
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
    };

    let authConstruct: AmplifyReferenceAuth;
    try {
      authConstruct = new AmplifyReferenceAuth(scope, this.name, authProps);
    } catch (error) {
      throw new AmplifyUserError(
        'AmplifyReferenceAuthConstructInitializationError',
        {
          message: 'Failed to instantiate reference auth construct',
          resolution: 'See the underlying error message for more details.',
        },
        error as Error
      );
    }

    Tags.of(authConstruct).add(TagName.FRIENDLY_NAME, this.name);

    const authConstructMixin: BackendReferenceAuth = {
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
            throw new AmplifyUserError('InvalidResourceAccessConfigError', {
              message: `No auth IAM role found for "${roleIdentifier}".`,
              resolution: `If you are trying to configure UserPool group access, ensure that the group name is specified correctly.`,
            });
          }
          policy.attachToRole(role);
        },
      }),
      stack: Stack.of(authConstruct),
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
        [`${this.name}_USERPOOL_ID`]:
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
 * Provide references to existing auth resources.
 */
export const referenceAuth = (
  props: AmplifyReferenceAuthProps
): ConstructFactory<BackendReferenceAuth> => {
  return new AmplifyReferenceAuthFactory(
    props,
    // eslint-disable-next-line amplify-backend-rules/prefer-amplify-errors
    new Error().stack
  );
};

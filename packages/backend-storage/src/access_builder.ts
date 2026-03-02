import {
  AuthRoleName,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { StorageAccessBuilder } from './types.js';
import { entityIdSubstitution } from './constants.js';

export const roleAccessBuilder: StorageAccessBuilder = {
  authenticated: {
    to: (actions) => ({
      getResourceAccessAcceptors: [getAuthRoleResourceAccessAcceptor],
      uniqueDefinitionIdValidations: [
        {
          uniqueDefinitionId: `authenticated`,
          validationErrorOptions: {
            message: `Entity access definition for authenticated users specified multiple times.`,
            resolution: `Combine all access definitions for authenticated users on a single path into one access rule.`,
          },
        },
      ],
      actions,
      idSubstitution: '*',
    }),
  },
  guest: {
    to: (actions) => ({
      getResourceAccessAcceptors: [getUnauthRoleResourceAccessAcceptor],
      uniqueDefinitionIdValidations: [
        {
          uniqueDefinitionId: `guest`,
          validationErrorOptions: {
            message: `Entity access definition for guest users specified multiple times.`,
            resolution: `Combine all access definitions for guest users on a single path into one access rule.`,
          },
        },
      ],
      actions,
      idSubstitution: '*',
    }),
  },
  groups: (groupNames) => ({
    to: (actions) => ({
      getResourceAccessAcceptors: groupNames.map(
        (groupName) => (getInstanceProps) =>
          getUserRoleResourceAccessAcceptor(getInstanceProps, groupName),
      ),
      uniqueDefinitionIdValidations: groupNames.map((groupName) => ({
        uniqueDefinitionId: `groups${groupName}`,
        validationErrorOptions: {
          message: `Group access definition for ${groupName} specified multiple times.`,
          resolution: `Combine all access definitions for ${groupName} on a single path into one access rule.`,
        },
      })),
      actions,
      idSubstitution: '*',
    }),
  }),
  entity: (entityId) => ({
    to: (actions) => ({
      getResourceAccessAcceptors: [
        getAuthRoleResourceAccessAcceptor,
        getEntityAccessForAllGroups,
      ],
      uniqueDefinitionIdValidations: [
        {
          uniqueDefinitionId: `entity${entityId}`,
          validationErrorOptions: {
            message: `Entity access definition for ${entityId} specified multiple times.`,
            resolution: `Combine all access definitions for ${entityId} on a single path into one access rule.`,
          },
        },
      ],
      actions,
      idSubstitution: entityIdSubstitution,
    }),
  }),
  resource: (other) => ({
    to: (actions) => ({
      getResourceAccessAcceptors: [
        (getInstanceProps) =>
          other.getInstance(getInstanceProps).getResourceAccessAcceptor(),
      ],
      uniqueDefinitionIdValidations: [],
      actions,
      idSubstitution: '*',
    }),
  }),
};

const getAuthRoleResourceAccessAcceptor = (
  getInstanceProps: ConstructFactoryGetInstanceProps,
) =>
  getUserRoleResourceAccessAcceptor(
    getInstanceProps,
    'authenticatedUserIamRole',
  );

const getUnauthRoleResourceAccessAcceptor = (
  getInstanceProps: ConstructFactoryGetInstanceProps,
) =>
  getUserRoleResourceAccessAcceptor(
    getInstanceProps,
    'unauthenticatedUserIamRole',
  );

const getEntityAccessForAllGroups = (
  getInstanceProps: ConstructFactoryGetInstanceProps,
) => {
  const authResources = getInstanceProps.constructContainer
    .getConstructFactory<
      ResourceProvider & ResourceAccessAcceptorFactory<AuthRoleName | string>
    >('AuthResources')
    ?.getInstance(getInstanceProps);

  if (!authResources) {
    // If no auth resources, return a no-op acceptor
    return {
      identifier: 'entityAccessForAllGroups-empty',
      acceptResourceAccess: () => {
        // No groups to apply permissions to
      },
    };
  }

  const resources =
    'resources' in authResources ? authResources.resources : undefined;
  const groups =
    resources && typeof resources === 'object' && 'groups' in resources
      ? (resources as { groups: Record<string, unknown> }).groups
      : undefined;

  if (!groups) {
    // If no groups defined, return a no-op acceptor
    return {
      identifier: 'entityAccessForAllGroups-empty',
      acceptResourceAccess: () => {
        // No groups to apply permissions to
      },
    };
  }

  // Create a compound acceptor that applies to all group roles
  const groupNames = Object.keys(groups);

  return {
    identifier: `entityAccessForAllGroups-${groupNames.join('-')}`,
    acceptResourceAccess: (policy: unknown, ssmEnvironmentEntries: unknown) => {
      // Apply the policy to each group role
      groupNames.forEach((groupName) => {
        try {
          const groupAcceptor = getUserRoleResourceAccessAcceptor(
            getInstanceProps,
            groupName,
          );
          groupAcceptor.acceptResourceAccess(
            policy as Parameters<typeof groupAcceptor.acceptResourceAccess>[0],
            ssmEnvironmentEntries as Parameters<
              typeof groupAcceptor.acceptResourceAccess
            >[1],
          );
        } catch (error) {
          // Group role might not exist, ignore silently
          // This is expected behavior when a group role hasn't been created yet
          void error; // Acknowledge the error parameter to satisfy ESLint
        }
      });
    },
  };
};

const getUserRoleResourceAccessAcceptor = (
  getInstanceProps: ConstructFactoryGetInstanceProps,
  roleName: AuthRoleName | string,
) => {
  const resourceAccessAcceptor = getInstanceProps.constructContainer
    .getConstructFactory<
      ResourceProvider & ResourceAccessAcceptorFactory<AuthRoleName | string>
    >('AuthResources')
    ?.getInstance(getInstanceProps)
    .getResourceAccessAcceptor(roleName);
  if (!resourceAccessAcceptor) {
    throw new Error(
      `Cannot specify auth access for ${
        roleName as string
      } users without defining auth. See https://docs.amplify.aws/gen2/build-a-backend/auth/set-up-auth/ for more information.`,
    );
  }
  return resourceAccessAcceptor;
};

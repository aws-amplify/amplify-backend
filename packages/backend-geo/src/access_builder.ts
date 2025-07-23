import {
  AuthRoleName,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { GeoAccessBuilder } from './types.js';

export const roleAccessBuilder: GeoAccessBuilder = {
  authenticated: {
    // access for authenticated users
    to: (actions) => ({
      getAccessAcceptors: [getAuthRoleAcceptor],
      actions,
      uniqueDefinitionValidators: [
        {
          uniqueRoleToken: 'authenticated',
          validationErrorOptions: {
            message: `Access definition for authenticated users specified multiple times.`,
            resolution: `Combine all access definitions for authenticated users into one access rule.`,
          },
        },
      ],
    }),
  },
  guest: {
    // access for guest users
    to: (actions) => ({
      getAccessAcceptors: [getUnauthRoleAcceptor],
      actions,
      uniqueDefinitionValidators: [
        {
          uniqueRoleToken: 'guest',
          validationErrorOptions: {
            message: `Access definition for guest users specified multiple times.`,
            resolution: `Combine all access definitions for guest users into one access rule.`,
          },
        },
      ],
    }),
  },
  groups: (groupNames) => ({
    // access for user groups
    to: (actions) => ({
      getAccessAcceptors: groupNames.map(
        // for each group in the user groups
        (groupName) => (getInstanceProps) =>
          getUserRoleAcceptor(getInstanceProps, groupName), // get role for that group (getting all acceptors from the groupNames specified)
      ),
      uniqueDefinitionValidators: groupNames.map((groupName) => ({
        uniqueRoleToken: `group-${groupName}`,
        validationErrorOptions: {
          message: `Access definition for the group ${groupName} specified multiple times.`,
          resolution: `Combine all access definitions for the group ${groupName} into one access rule.`,
        },
      })),
      actions,
    }),
  }),
};

const getAuthRoleAcceptor = (
  getInstanceProps: ConstructFactoryGetInstanceProps,
) => getUserRoleAcceptor(getInstanceProps, 'authenticatedUserIamRole');

const getUnauthRoleAcceptor = (
  getInstanceProps: ConstructFactoryGetInstanceProps,
) => getUserRoleAcceptor(getInstanceProps, 'unauthenticatedUserIamRole');

// getting acceptor objects for different role types (defined in auth)
const getUserRoleAcceptor = (
  getInstanceProps: ConstructFactoryGetInstanceProps, // instance properties of the auth factory?
  roleName: AuthRoleName | string, // name of role to get acceptors from
) => {
  const resourceAccessAcceptor = getInstanceProps.constructContainer
    .getConstructFactory<
      ResourceProvider & ResourceAccessAcceptorFactory<AuthRoleName | string>
    >(
      // getting construct container to look for a specific construct factory
      'AuthResources',
    )
    ?.getInstance(getInstanceProps)
    .getResourceAccessAcceptor(roleName); // getting resource access acceptor factory instance (part of AuthResources) // getting resource acceptors

  if (!resourceAccessAcceptor) {
    throw new Error(
      `Cannot specify geo resource access for ${
        roleName as string
      } users without defining auth. See https://docs.amplify.aws/gen2/build-a-backend/auth/set-up-auth/ for more information.`,
    );
  }
  return resourceAccessAcceptor;
};

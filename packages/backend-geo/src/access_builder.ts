import {
  AuthResources,
  AuthRoleName,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { GeoAccessBuilder } from './types.js';

export type Roles = IRole;

export const roleAccessBuilder: GeoAccessBuilder = {
  authenticated: {
    // access for authenticated users
    to: (actions) => ({
      userRoles: [getAuthRole],
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
      userRoles: [getUnauthRole],
      actions,
      uniqueDefinitionValidators: [
        {
          uniqueRoleToken: `guest`,
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
      userRoles: groupNames.map(
        // for each group in the user groups
        (groupName) => (getInstanceProps) =>
          getUserRole(getInstanceProps, groupName), // get role for that group (getting all acceptors from the groupNames specified)
      ),
      actions,
      uniqueDefinitionValidators: groupNames.map((groupName) => ({
        uniqueRoleToken: `${groupName}`,
        validationErrorOptions: {
          message: `Access definition for the group ${groupName} specified multiple times.`,
          resolution: `Combine all access definitions for the group ${groupName} into one access rule.`,
        },
      })),
    }),
  }),
};

const getAuthRole = (getInstanceProps: ConstructFactoryGetInstanceProps) =>
  getUserRole(getInstanceProps, 'authenticatedUserIamRole');

const getUnauthRole = (getInstanceProps: ConstructFactoryGetInstanceProps) =>
  getUserRole(getInstanceProps, 'unauthenticatedUserIamRole');

// getting acceptor objects for different role types (defined in auth)
const getUserRole = (
  getInstanceProps: ConstructFactoryGetInstanceProps, // instance properties of the auth factory?
  roleName: AuthRoleName | string, // name of role to get acceptors from
): IRole => {
  const authResources = getInstanceProps.constructContainer
    .getConstructFactory<
      ResourceProvider & ResourceAccessAcceptorFactory<AuthRoleName | string>
    >(
      // getting construct container to look for a specific construct factory
      'AuthResources',
    )
    ?.getInstance(getInstanceProps).resources as AuthResources; // getting resource access acceptor factory instance (part of AuthResources) // getting resource acceptors
  if (!authResources) {
    throw new Error(
      `Cannot specify geo resource access for ${
        roleName as string
      } users without defining auth. See https://docs.amplify.aws/gen2/build-a-backend/auth/set-up-auth/ for more information.`,
    );
  } else {
    if (roleName === authResources.authenticatedUserIamRole.roleName) {
      return authResources.authenticatedUserIamRole;
    } else if (roleName === authResources.unauthenticatedUserIamRole.roleName) {
      return authResources.unauthenticatedUserIamRole;
    } else if (authResources.groups[roleName]) {
      return authResources.groups[roleName].role;
    }
    throw new Error(
      `Role: ${
        roleName as string
      } does not exist. See https://console.aws.amazon.com/iam/ to define the role.`,
    );
  }
};

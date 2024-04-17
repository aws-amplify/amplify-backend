import {
  AuthRoleName,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { StorageAccessBuilder } from './types.js';

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
          getUserRoleResourceAccessAcceptor(getInstanceProps, groupName)
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
      getResourceAccessAcceptors: [getAuthRoleResourceAccessAcceptor],
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
      idSubstitution: '${cognito-identity.amazonaws.com:sub}',
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
  getInstanceProps: ConstructFactoryGetInstanceProps
) =>
  getUserRoleResourceAccessAcceptor(
    getInstanceProps,
    'authenticatedUserIamRole'
  );

const getUnauthRoleResourceAccessAcceptor = (
  getInstanceProps: ConstructFactoryGetInstanceProps
) =>
  getUserRoleResourceAccessAcceptor(
    getInstanceProps,
    'unauthenticatedUserIamRole'
  );

const getUserRoleResourceAccessAcceptor = (
  getInstanceProps: ConstructFactoryGetInstanceProps,
  roleName: AuthRoleName | string
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
      } users without defining auth. See https://docs.amplify.aws/gen2/build-a-backend/auth/set-up-auth/ for more information.`
    );
  }
  return resourceAccessAcceptor;
};

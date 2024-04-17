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
      actions,
      idSubstitution: '*',
    }),
  },
  guest: {
    to: (actions) => ({
      getResourceAccessAcceptors: [getUnauthRoleResourceAccessAcceptor],
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
      actions,
      idSubstitution: '*',
    }),
  }),
  entity: () => ({
    to: (actions) => ({
      getResourceAccessAcceptors: [getAuthRoleResourceAccessAcceptor],
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

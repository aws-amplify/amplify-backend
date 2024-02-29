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
      getResourceAccessAcceptor: getAuthRoleResourceAccessAcceptor,
      actions,
      ownerPlaceholderSubstitution: '*',
    }),
  },
  guest: {
    to: (actions) => ({
      getResourceAccessAcceptor: getUnauthRoleResourceAccessAcceptor,
      actions,
      ownerPlaceholderSubstitution: '*',
    }),
  },
  owner: {
    to: (actions) => ({
      getResourceAccessAcceptor: getAuthRoleResourceAccessAcceptor,
      actions,
      ownerPlaceholderSubstitution: '${cognito-identity.amazonaws.com:sub}',
    }),
  },
  resource: (other) => ({
    to: (actions) => ({
      getResourceAccessAcceptor: (getInstanceProps) =>
        other.getInstance(getInstanceProps).getResourceAccessAcceptor(),
      actions,
      ownerPlaceholderSubstitution: '*',
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
  roleName: AuthRoleName
) => {
  const resourceAccessAcceptor = getInstanceProps.constructContainer
    .getConstructFactory<
      ResourceProvider & ResourceAccessAcceptorFactory<AuthRoleName>
    >('AuthResources')
    ?.getInstance(getInstanceProps)
    .getResourceAccessAcceptor(roleName);
  if (!resourceAccessAcceptor) {
    throw new Error(
      `Cannot specify ${
        roleName as string
      } user policies without defining auth. See <defineAuth docs link> for more information.`
    );
  }
  return resourceAccessAcceptor;
};

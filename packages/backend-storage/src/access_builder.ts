import {
  AuthRoleName,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptor,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';

export type StorageAction = 'read' | 'write' | 'delete';

export type StorageAccessDefinition = {
  getResourceAccessAcceptor: (
    getInstanceProps: ConstructFactoryGetInstanceProps
  ) => ResourceAccessAcceptor;
  actions: StorageAction[];
  resourceSuffix: string;
};

export type StorageAccessBuilder = {
  to: (...actions: StorageAction[]) => StorageAccessDefinition;
};

/**
 * !EXPERIMENTAL!
 *
 * Resource access patterns are under active development and are subject to breaking changes.
 * Do not use in production.
 */
export type RoleAccessBuilder = {
  authenticated: StorageAccessBuilder;
  unauthenticated: StorageAccessBuilder;
  owner: StorageAccessBuilder;
  resource: (
    other: ConstructFactory<ResourceProvider & ResourceAccessAcceptorFactory>
  ) => StorageAccessBuilder;
};

export const storageAccessBuilder: RoleAccessBuilder = {
  authenticated: {
    to: (...actions) => ({
      getResourceAccessAcceptor: getAuthRoleResourceAccessAcceptor,
      actions,
      resourceSuffix: '*',
    }),
  },
  unauthenticated: {
    to: (...actions) => ({
      getResourceAccessAcceptor: getUnauthRoleResourceAccessAcceptor,
      actions,
      resourceSuffix: '*',
    }),
  },
  owner: {
    to: (...actions) => ({
      getResourceAccessAcceptor: getAuthRoleResourceAccessAcceptor,
      actions,
      resourceSuffix: '${cognito-identity.amazon.com:sub}/*',
    }),
  },
  resource: (other) => ({
    to: (...actions) => ({
      getResourceAccessAcceptor: (getInstanceProps) =>
        other.getInstance(getInstanceProps).getResourceAccessAcceptor(),
      actions,
      resourceSuffix: '*',
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

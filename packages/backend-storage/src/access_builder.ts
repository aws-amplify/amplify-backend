import {
  AuthRoleName,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptor,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';

export type StorageAction = 'read' | 'write' | 'delete';

export type StorageAccess = {
  getResourceAccessAcceptor: (
    getInstanceProps: ConstructFactoryGetInstanceProps
  ) => ResourceAccessAcceptor;
  actions: StorageAction[];
  resourceSuffix: string;
};

export type StorageAccessBuilder = {
  to: (...actions: StorageAction[]) => StorageAccess;
};

export type EntityAccessBuilder = {
  authenticated: StorageAccessBuilder;
  unauthenticated: StorageAccessBuilder;
  owner: StorageAccessBuilder;
  resource: (
    other: ConstructFactory<ResourceProvider & ResourceAccessAcceptorFactory>
  ) => StorageAccessBuilder;
};

export const storageAccessBuilder: EntityAccessBuilder = {
  authenticated: {
    to: (...actions) => ({
      getResourceAccessAcceptor: (getInstanceProps) =>
        getAuthRoleResourceAccessAcceptor(
          getInstanceProps,
          'authenticatedUserIamRole'
        ),
      actions,
      resourceSuffix: '*',
    }),
  },
  unauthenticated: {
    to: (...actions) => ({
      getResourceAccessAcceptor: (getInstanceProps) =>
        getAuthRoleResourceAccessAcceptor(
          getInstanceProps,
          'unauthenticatedUserIamRole'
        ),
      actions,
      resourceSuffix: '*',
    }),
  },
  owner: {
    to: (...actions) => ({
      getResourceAccessAcceptor: (getInstanceProps) =>
        getAuthRoleResourceAccessAcceptor(
          getInstanceProps,
          'authenticatedUserIamRole'
        ),
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

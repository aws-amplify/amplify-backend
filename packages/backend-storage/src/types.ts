import {
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptor,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { AmplifyStorageProps } from './construct.js';

export type AmplifyStorageFactoryProps = Omit<
  AmplifyStorageProps,
  'outputStorageStrategy'
> & {
  /**
   * !EXPERIMENTAL!
   *
   * Access control is under active development and is subject to change without notice.
   * Use at your own risk and do not use in production
   */
  access?: AccessGenerator;
};

/**
 * !EXPERIMENTAL!
 *
 * Resource access patterns are under active development and are subject to breaking changes.
 * Do not use in production.
 */
export type RoleAccessBuilder = {
  authenticated: StorageAccessBuilder;
  guest: StorageAccessBuilder;
  owner: StorageAccessBuilder;
  resource: (
    other: ConstructFactory<ResourceProvider & ResourceAccessAcceptorFactory>
  ) => StorageAccessBuilder;
};

export type StorageAccessBuilder = {
  to: (actions: StorageAction[]) => StorageAccessDefinition;
};

export type AccessGenerator = (allow: RoleAccessBuilder) => StorageAccessRecord;

export type StorageAccessRecord = Record<
  StoragePath,
  StorageAccessDefinition[]
>;

export type StorageAccessDefinition = {
  getResourceAccessAcceptor: (
    getInstanceProps: ConstructFactoryGetInstanceProps
  ) => ResourceAccessAcceptor;
  /**
   * Actions to grant to this role on a specific prefix
   */
  actions: StorageAction[];
  /**
   * The value that will be substituted into the resource string in place of the {owner} token
   */
  ownerPlaceholderSubstitution: string;
};

export type StorageAction = 'read' | 'write' | 'delete';

/**
 * Storage access keys must start with / and end with /*
 */
export type StoragePath = `/${string}/*`;

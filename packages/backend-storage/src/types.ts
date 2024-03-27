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
  access?: StorageAccessGenerator;
};

/**
 * Types of entity IDs that can be substituted in access policies
 *
 * 'identity' corresponds to the Cognito Identity Pool IdentityID
 *
 * Currently this is the only supported entity type.
 */
export type EntityId = 'identity';

/**
 * !EXPERIMENTAL!
 *
 * Resource access patterns are under active development and are subject to breaking changes.
 * Do not use in production.
 */
export type StorageAccessBuilder = {
  authenticated: StorageActionBuilder;
  guest: StorageActionBuilder;
  group: (groupName: string) => StorageActionBuilder;
  entity: (entityId: EntityId) => StorageActionBuilder;
  resource: (
    other: ConstructFactory<ResourceProvider & ResourceAccessAcceptorFactory>
  ) => StorageActionBuilder;
};

export type StorageActionBuilder = {
  to: (actions: StorageAction[]) => StorageAccessDefinition;
};

export type StorageAccessGenerator = (
  allow: StorageAccessBuilder
) => StorageAccessRecord;

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
  idSubstitution: string;
};

/**
 * Actions that can be granted to specific paths within the storage resource.
 *
 * 'read' grants both 'get' and 'list' actions.
 *
 * 'get' grants the ability to fetch objects matching the path prefix.
 *
 * 'list' grants the ability to list object names matching the path prefix. It does NOT grant the ability to get the content of those objects.
 *
 * 'write' grants the ability to upload objects with a certain prefix. Note that this allows both creating new objects and updating existing ones.
 *
 * 'delete' grant the ability to delete objects with a certain prefix.
 */
export type StorageAction = 'read' | 'get' | 'list' | 'write' | 'delete';

/**
 * Storage access paths must end with /*
 */
export type StoragePath = `${string}/*`;

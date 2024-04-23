import {
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptor,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { AmplifyStorageProps } from './construct.js';
import { AmplifyUserErrorOptions } from '@aws-amplify/platform-core';

export type AmplifyStorageFactoryProps = Omit<
  AmplifyStorageProps,
  'outputStorageStrategy'
> & {
  /**
   * Define access permissions for objects in the S3 bucket.
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#storage-access
   * @example
   * export const storage = defineStorage({
   *   access: (allow) => ({
   *     'foo/*': [allow.authenticated.to(['read'])],
   *   })
   * })
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
 * Utility object for configuring storage access
 */
export type StorageAccessBuilder = {
  /**
   * Configure storage access for authenticated users. Requires `defineAuth` in the backend definition.
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#authenticated-user-access
   */
  authenticated: StorageActionBuilder;
  /**
   * Configure storage access for guest (unauthenticated) users. Requires `defineAuth` in the backend definition.
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#guest-user-access
   */
  guest: StorageActionBuilder;
  /**
   * Configure storage access for User Pool groups. Requires `defineAuth` with groups config in the backend definition.
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#user-group-access
   * @param groupName The User Pool group name to configure access for
   */
  groups: (groupNames: string[]) => StorageActionBuilder;
  /**
   * Configure owner-based access. Requires `defineAuth` in the backend definition.
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#owner-based-access
   * @param entityId Defines the identifier that is used to identify owners. Currently only "identity" is supported.
   */
  entity: (entityId: EntityId) => StorageActionBuilder;
  /**
   * Grant other resources in the Amplify backend access to storage.
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#grant-function-access
   * @param other The target resource to grant access to. Currently only the return value of `defineFunction` is supported.
   */
  resource: (
    other: ConstructFactory<ResourceProvider & ResourceAccessAcceptorFactory>
  ) => StorageActionBuilder;
};

export type StorageActionBuilder = {
  /**
   * Specify which actions an entity will be able to perform on objects in the S3 bucket.
   *
   * 'read' is mutually exclusive with 'get' and 'list'
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#available-actions
   * @param actions A list of allowed actions
   */
  to: (
    actions:
      | Exclude<StorageAction, 'get' | 'list'>[]
      | Exclude<StorageAction, 'read'>[]
  ) => StorageAccessDefinition;
};

export type StorageAccessGenerator = (
  allow: StorageAccessBuilder
) => StorageAccessRecord;

export type StorageAccessRecord = Record<
  StoragePath,
  StorageAccessDefinition[]
>;

export type StorageAccessDefinition = {
  getResourceAccessAcceptors: ((
    getInstanceProps: ConstructFactoryGetInstanceProps
  ) => ResourceAccessAcceptor)[];
  /**
   * Actions to grant to this role on a specific prefix
   */
  actions: StorageAction[];
  /**
   * The value that will be substituted into the resource string in place of the {owner} token
   */
  idSubstitution: string;
  /**
   * Evaluation of the access definition will ensure that all uniqueDefinitionIds occur at most once for a given access path.
   * This can be used to validate against definitions like
   *
   * {
   *   'foo/*': [
   *     allow.authenticated.to(['read']),
   *     allow.authenticated.to(['write'])
   *   ]
   * }
   *
   * and instead require such a definition to be specified as
   *
   * {
   *   'foo/*': [
   *     allow.authenticated.to(['read', 'write']),
   *   ]
   * }
   *
   * The validationErrorMessage will be used to print an error message in case of validation failure
   *
   * An empty array means that no uniqueness will be enforced
   */
  uniqueDefinitionIdValidations: {
    uniqueDefinitionId: string;
    validationErrorOptions: AmplifyUserErrorOptions;
  }[];
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

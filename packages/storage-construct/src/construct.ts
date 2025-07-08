import { Construct } from 'constructs';
import { CfnBucket, EventType, IBucket } from 'aws-cdk-lib/aws-s3';
import {
  AuthResources,
  ResourceProvider,
  StackProvider,
} from '@aws-amplify/plugin-types';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { S3EventSourceV2 } from 'aws-cdk-lib/aws-lambda-event-sources';
import { IGrantable } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';

export type AmplifyStorageProps = {
  /**
   * Whether this storage resource is the default storage resource for the backend.
   * required and relevant only if there are multiple storage resources defined.
   * @default false.
   */
  isDefault?: boolean;
  /**
   * Friendly name that will be used to derive the S3 Bucket name
   */
  name?: string;
  /**
   * Whether to enable S3 object versioning on the bucket.
   * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html
   * @default false
   */
  versioned?: boolean;
};

export type StorageResources = {
  bucket: IBucket;
  cfnResources: {
    cfnBucket: CfnBucket;
  };
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

export type StorageAuthActionBuilder = {
  /**
   * Specify which actions an entity will be able to perform on objects in the S3 bucket.
   *
   * 'read' is mutually exclusive with 'get' and 'list'
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/authorization/#available-actions
   * @param actions A list of allowed actions
   */
  to: (
    actions:
      | Exclude<StorageAction, 'get' | 'list'>[]
      | Exclude<StorageAction, 'read'>[],
  ) => void;
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
export type StorageAuthAccessBuilder = {
  /**
   * Configure storage access for authenticated users. Requires `defineAuth` in the backend definition.
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#authenticated-user-access
   *
   * When configuring access for paths with the `{entity_id}` token, the token is replaced with a wildcard (`*`).
   * For a path like `media/profile-pictures/{entity_id}/*`, this means access is configured for authenticated users for any file within
   * `media/profile-pictures/*`.
   */
  authenticated: StorageAuthActionBuilder;
  /**
   * Configure storage access for guest (unauthenticated) users. Requires `defineAuth` in the backend definition.
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#guest-user-access
   *
   * When configuring access for paths with the `{entity_id}` token, the token is replaced with a wildcard (`*`).
   * For a path like `media/profile-pictures/{entity_id}/*`, this means access is configured for guest users for any file within
   * `media/profile-pictures/*`.
   */
  guest: StorageAuthActionBuilder;
  /**
   * Configure storage access for User Pool groups. Requires `defineAuth` with groups config in the backend definition.
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#user-group-access
   * @param groupName The User Pool group name to configure access for
   *
   * When configuring access for paths with the `{entity_id}` token, the token is replaced with a wildcard (`*`).
   * For a path like `media/profile-pictures/{entity_id}/*`, this means access is configured for that specific group for any file within
   * `media/profile-pictures/*`.
   */
  groups: (groupNames: string[]) => StorageAuthActionBuilder;
  /**
   * Configure owner-based access. Requires `defineAuth` in the backend definition.
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#owner-based-access
   * @param entityId Defines the identifier that is used to identify owners. Currently only "identity" is supported.
   */
  entity: (entityId: EntityId) => StorageAuthActionBuilder;
};

export type StorageAuthAccessGenerator = (
  allow: StorageAuthAccessBuilder,
) => void;

/**
 * TODO
 */
export class AmplifyStorage
  extends Construct
  implements ResourceProvider<StorageResources>, StackProvider
{
  readonly stack: Stack;
  readonly resources: StorageResources;
  readonly isDefault: boolean;
  readonly name: string;

  /**
   * TODO
   */
  constructor(scope: Construct, id: string, props: AmplifyStorageProps = {}) {
    super(scope, id);
  }

  /**
   * Attach a Lambda function trigger handler to the S3 events
   * @param events - list of S3 events that will trigger the handler
   * @param handler - The function that will handle the event
   */
  addTrigger = (events: EventType[], handler: IFunction): void => {
    handler.addEventSource(
      new S3EventSourceV2(this.resources.bucket, { events }),
    );
  };

  grantAccess(grantable: IGrantable, path: StoragePath): void;
  grantAccess(
    auth: ResourceProvider<AuthResources>,
    access: StorageAuthAccessGenerator,
  ): void;
  grantAccess(grantableOrAuth: any, pathOrAccess: any): void {}
}

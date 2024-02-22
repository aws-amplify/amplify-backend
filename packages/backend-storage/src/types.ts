import {
  RoleAccessBuilder,
  StoragePathAccessDefinition,
} from './access_builder.js';
import { AmplifyStorageProps } from './construct.js';

export type AmplifyStorageTriggerEvent = 'onDelete' | 'onUpload';

/**
 * Storage access keys must start with / and end with /*
 */
export type StoragePath = `/${string}/*`;

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

export type StorageAccessRecord = Record<
  StoragePath,
  StoragePathAccessDefinition[]
>;

export type AccessGenerator = (allow: RoleAccessBuilder) => StorageAccessRecord;

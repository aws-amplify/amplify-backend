/**
 * Types that should remain internal to the package
 */

import { StorageAction } from './types.js';

/**
 * Storage user error types
 */
export type StorageError =
  | 'InvalidStorageAccessDefinitionError'
  | 'InvalidStorageAccessPathError';

/**
 * StorageAction type intended to be used after mapping "read" to "get" and "list"
 */
export type InternalStorageAction = Exclude<StorageAction, 'read'>;

/**
 * Storage access types intended to be used to map storage access to storage outputs
 */
export type StorageAccessConfig = Record<string, InternalStorageAction[]>;
export type StorageAccessDefinitionOutput = Record<string, StorageAccessConfig>;

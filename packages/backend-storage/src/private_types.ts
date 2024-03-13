/**
 * Types that should remain internal to the package
 */

import { StorageAction } from './types.js';

/**
 * Storage user error types
 */
export type StorageError = 'InvalidStorageAccessPathError';

/**
 * StorageAction type intended to be used after mapping "read" to "get" and "list"
 */
export type InternalStorageAction = Exclude<StorageAction, 'read'>;

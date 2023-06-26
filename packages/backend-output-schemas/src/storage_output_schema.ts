import { z } from 'zod';
import { BackendOutputEntry } from '@aws-amplify/plugin-types';

export const storageOutputSchema = z.object({
  bucketName: z.string(),
});

export type StorageOutputType = z.infer<typeof storageOutputSchema>;

/**
 * Backend outputs from Storage
 */
export class StorageOutput implements BackendOutputEntry<StorageOutputType> {
  readonly schemaIdentifier = {
    schemaName: 'StorageOutput',
    schemaVersion: 1,
  };

  /**
   * Internal constructor
   */
  private constructor(readonly payload: StorageOutputType) {}

  /**
   * Construct a StorageOutput instance with runtime validation of the storageOutput shape
   */
  static fromStorageOutput(storageOutput: StorageOutputType) {
    return new StorageOutput(storageOutputSchema.parse(storageOutput));
  }
}

import { z } from 'zod';
import { storageOutputSchema as storageOutputSchemaV1 } from './v1.js';

export const versionedStorageOutputSchema = z.discriminatedUnion('version', [
  storageOutputSchemaV1,
  // this is where additional storage major version schemas would go
]);

export type StorageOutput = z.infer<typeof versionedStorageOutputSchema>;

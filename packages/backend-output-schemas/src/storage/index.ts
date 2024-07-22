import { z } from 'zod';
import { storageOutputSchema as storageOutputSchemaV1 } from './v1.js';

export const versionedStorageOutputSchema = z.discriminatedUnion('version', [
  storageOutputSchemaV1,
  // this is where additional storage major version schemas would go
]);

export type StorageOutput = z.infer<typeof versionedStorageOutputSchema>;

export type PickPayload<
  T extends { payload: object },
  K extends keyof T['payload']
> = {
  payload: Pick<T['payload'], K>;
};

export type TransformType<
  T extends { version: string; payload: object },
  K extends keyof T['payload']
> = PickPayload<T, K> & { version: T['version'] };

export type StorageBucketsPayload = TransformType<StorageOutput, 'buckets'>;

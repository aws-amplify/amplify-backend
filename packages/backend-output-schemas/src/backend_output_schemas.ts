import { z } from 'zod';

export const authOutputSchemaV1 = z.object({
  version: z.literal(1),
  payload: z.object({
    userPoolId: z.string(),
  }),
});

export const versionedAuthOutputSchema = z.discriminatedUnion('version', [
  authOutputSchemaV1,
  // this is where additional auth major version schemas would go
]);

export const storageOutputSchemaV1 = z.object({
  version: z.literal(1),
  payload: z.object({
    bucketName: z.string(),
  }),
});

export const versionedStorageOutputSchema = z.discriminatedUnion('version', [
  storageOutputSchemaV1,
  // this is where additional storage major version schemas would go
]);

export const dataOutputSchemaV1 = z.object({
  version: z.literal(1),
  payload: z.object({
    appSyncApiEndpoint: z.string(),
    appSyncApiKey: z.string().optional(),
  }),
});

export type DataOutputV1 = z.infer<typeof dataOutputSchemaV1>;

export const versionedDataOutputSchema = z.discriminatedUnion('version', [
  dataOutputSchemaV1,
  // this is where additional data major version schemas would go
]);

export const authOutputKey = 'authOutput';
export const dataOutputKey = 'dataOutput';
export const storageOutputKey = 'storageOutput';

/**
 * Defines the unified expected shape of Amplify backend output.
 * As new constructs are added that need to contribute backend output, entries should be added here so that client config generation is aware of these outputs
 */
export const backendOutputSchema = z.object({
  [authOutputKey]: versionedAuthOutputSchema.optional(),
  [dataOutputKey]: versionedDataOutputSchema.optional(),
  [storageOutputKey]: versionedStorageOutputSchema.optional(),
});

/**
 * This type is a subset of the BackendOutput type that is exposed by the platform.
 * It represents BackendOutput that has been validated against the schema of known output values
 */
export type StrictlyTypedBackendOutput = z.infer<typeof backendOutputSchema>;

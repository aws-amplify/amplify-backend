import { z } from 'zod';
import {
  versionedApiOutputSchema,
  ApiOutputKey,
} from '@aws-amplify/api-output-schema';
import { versionedAuthOutputSchema } from './auth/index.js';
import { versionedStorageOutputSchema } from './storage/index.js';

/**
 * Expected key that auth output is stored under
 */
export const authOutputKey = 'authOutput';
/**
 * Expected key that storage output is stored under
 */
export const storageOutputKey = 'storageOutput';
/**
 * Defines the unified expected shape of Amplify backend output.
 * As new constructs are added that need to contribute backend output, entries should be added here so that client config generation is aware of these outputs
 */
export const unifiedBackendOutputSchema = z.object({
  [authOutputKey]: versionedAuthOutputSchema.optional(),
  [apiOutputKey]: versionedApiOutputSchema.option(),
  [storageOutputKey]: versionedStorageOutputSchema.optional(),
});
/**
 * This type is a subset of the BackendOutput type that is exposed by the platform.
 * It represents BackendOutput that has been validated against the schema of known output values
 */
export type UnifiedBackendOutput = z.infer<typeof unifiedBackendOutputSchema>;

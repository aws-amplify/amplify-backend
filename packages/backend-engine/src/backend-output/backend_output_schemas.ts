import { z } from 'zod';

/**
 * Data schema for storing a backend output entry using stack metadata
 */
export const backendOutputEntryStackMetadataSchema = z.object({
  constructVersion: z.string(),
  stackOutputs: z.array(z.string()),
});

/**
 * Inferred type from backendOutputEntryStackMetadataSchema
 */
export type BackendOutputEntryStackMetadata = z.infer<
  typeof backendOutputEntryStackMetadataSchema
>;

/**
 * Data schema for storing backend output using stack metadata
 */
export const backendOutputStackMetadataSchema = z.record(
  backendOutputEntryStackMetadataSchema
);

/**
 * Inferred type from backendOutputStackMetadataSchema
 */
export type BackendOutputStackMetadata = z.infer<
  typeof backendOutputStackMetadataSchema
>;

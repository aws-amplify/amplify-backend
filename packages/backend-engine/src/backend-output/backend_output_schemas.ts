import { z } from 'zod';

/**
 * Schema for a single block of output written by a construct
 */
export const backendOutputEntrySchema = z.object({
  constructVersion: z.string(),
  stackOutputs: z.array(z.string()),
});

/**
 * Inferred type from outputEntrySchema
 */
export type BackendOutputEntry = z.infer<typeof backendOutputEntrySchema>;

/**
 * Schema for the record of all output written by all constructs
 * The keys of the record are the package names of the constructs
 */
export const backendOutputSchema = z.record(backendOutputEntrySchema);

/**
 * Inferred type from backendOutputSchema
 */
export type BackendOutput = z.infer<typeof backendOutputSchema>;

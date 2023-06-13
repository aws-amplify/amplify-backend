import { z } from 'zod';

export const metadataEntrySchema = z.object({
  constructVersion: z.string(),
  stackOutputs: z.array(z.string()),
});

export type MetadataEntry = z.infer<typeof metadataEntrySchema>;

export const stackMetadataSchema = z.record(metadataEntrySchema);

export type StackMetadata = z.infer<typeof stackMetadataSchema>;

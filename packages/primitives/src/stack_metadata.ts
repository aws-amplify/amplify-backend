import { z } from 'zod';

export const metadataEntry = z.object({
  constructVersion: z.string(),
  stackOutputs: z.array(z.string()),
});

export type MetadataEntry = z.infer<typeof metadataEntry>;

export const stackMetadata = z.record(metadataEntry);

export type StackMetadata = z.infer<typeof stackMetadata>;

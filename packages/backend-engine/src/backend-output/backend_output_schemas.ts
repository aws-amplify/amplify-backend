import { z } from 'zod';

export const outputEntrySchema = z.object({
  constructVersion: z.string(),
  stackOutputs: z.array(z.string()),
});

export type OutputEntry = z.infer<typeof outputEntrySchema>;

export const backendOutputSchema = z.record(outputEntrySchema);

export type BackendOutput = z.infer<typeof backendOutputSchema>;

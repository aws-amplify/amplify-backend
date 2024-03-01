import { z } from 'zod';

export const customOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    customOutputs: z.string(), // serialized Partial<ClientConfig>
  }),
});

import { z } from 'zod';

export const customOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.record(z.string(), z.string()),
});

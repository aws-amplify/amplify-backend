import { z } from 'zod';

export const hostingOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    distributionUrl: z.string(),
  }),
});

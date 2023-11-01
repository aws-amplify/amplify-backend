import { z } from 'zod';

export const stackOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    deploymentType: z.string(),
    region: z.string(),
  }),
});

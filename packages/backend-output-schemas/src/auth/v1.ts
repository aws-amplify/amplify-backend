import { z } from 'zod';

export const authOutputSchema = z.object({
  version: z.literal(1),
  payload: z.object({
    userPoolId: z.string(),
  }),
});

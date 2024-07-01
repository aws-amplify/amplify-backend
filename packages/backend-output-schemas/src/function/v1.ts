import { z } from 'zod';

export const functionOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    definedFunctions: z.string().optional(), // JSON array as string
  }),
});

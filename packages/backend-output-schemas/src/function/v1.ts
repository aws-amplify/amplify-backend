import { z } from 'zod';

export const functionOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    customerFunctions: z.string(), // JSON array as string
  }),
});

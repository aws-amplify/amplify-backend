import { z } from 'zod';

export const dataOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    appSyncApiEndpoint: z.string(),
    appSyncApiKey: z.string().optional(),
  }),
});

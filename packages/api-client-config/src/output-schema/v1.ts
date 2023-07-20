import { z } from 'zod';

export const apiOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    awsAppsyncRegion: z.string().optional(),
    awsAppsyncApiEndpoint: z.string(),
    awsAppsyncAuthenticationType: z.string().optional(),
    awsAppsyncApiKey: z.string().optional(),
  }),
});

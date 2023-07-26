import { z } from 'zod';

export const graphqlOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    awsAppsyncRegion: z.string(),
    awsAppsyncApiEndpoint: z.string(),
    awsAppsyncAuthenticationType: z.string(),
    awsAppsyncApiKey: z.string().optional(),
  }),
});

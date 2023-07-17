import { z } from 'zod';

export const apiOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    appSyncRegion: z.string().optional(),
    appSyncApiEndpoint: z.string(),
    appSyncApiKey: z.string().optional(),
    appSyncAuthenticationType: z.string().optional(),
    graphqlEndpoint: z.string().optional(),
    graphqlEndpointIamRegion: z.string().optional(),
  }),
});

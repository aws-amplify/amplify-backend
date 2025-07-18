import { z } from 'zod';

export const geoOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    defaultCollection: z.string(),
    geoRegion: z.string(),
    collections: z.string(z.array(z.string()).optional()), // JSON serialized array of collection names
  }),
});

import { z } from 'zod';

const collectionSchema = z.object({
  default: z.string(),
  items: z.array(z.string()),
});

export const geoOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    geoRegion: z.string(),
    maps: z.string().optional(), // JSON serialized string
    searchIndices: z.string().optional(), // JSON serialized string
    geofenceCollections: z.string(collectionSchema).optional(), // JSON serialized string
  }),
});

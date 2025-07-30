import { z } from 'zod';

const collectionConstructSchema = z.object({
  default: z.string(),
  items: z.array(z.string()),
});

const resourceItemSchema = z.object({
  name: z.string(),
  api_key: z.string().optional(),
});

const resourceSchema = z.object({
  default: z.string(),
  items: z.string(z.array(resourceItemSchema)),
});

export const geoOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    geoRegion: z.string(),
    maps: z.string(resourceSchema).optional(), // JSON serialized string
    searchIndices: z.string(resourceSchema).optional(), // JSON serialized string
    geofenceCollections: z.string(collectionConstructSchema).optional(), // JSON serialized string
  }),
});

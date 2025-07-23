import { z } from 'zod';

const collectionSchema = z.object({
  default: z.string(),
  items: z.string(z.array(z.string())).optional(),
});

export const geoOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    aws_region: z.string(),
    geofence_collections: z.string(collectionSchema).optional(),
  }),
});

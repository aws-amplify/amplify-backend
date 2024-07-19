import { z } from 'zod';

const bucketSchema = z.object({
  name: z.string(),
  bucketName: z.string(),
  storageRegion: z.string(),
});

export const storageOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    bucketName: z.string(),
    storageRegion: z.string(),
    buckets: z.string(z.array(bucketSchema)).optional(), // JSON serialized array of bucketSchema
  }),
});

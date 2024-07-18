import { z } from 'zod';

const bucketSchema = z.object({
  name: z.string(),
  bucket_name: z.string(),
  aws_region: z.string(),
});

export const storageOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    bucketName: z.string(),
    storageRegion: z.string(),
    buckets: z.array(bucketSchema).optional(),
  }),
});

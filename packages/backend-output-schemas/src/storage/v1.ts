import { z } from 'zod';

const storageAccessActionEnum = z.enum([
  'read',
  'get',
  'list',
  'write',
  'delete',
]);

const pathSchema = z.record(
  z.string(),
  z.record(z.string(), z.array(storageAccessActionEnum)),
);

const bucketSchema = z.object({
  name: z.string(),
  bucketName: z.string(),
  storageRegion: z.string(),
  paths: pathSchema.optional(),
});

export const storageOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    bucketName: z.string(),
    storageRegion: z.string(),
    buckets: z.string(z.array(bucketSchema)).optional(), // JSON serialized array of bucketSchema
  }),
});

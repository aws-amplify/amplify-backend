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
  z.object({
    guest: z.array(storageAccessActionEnum).optional(),
    authenticated: z.array(storageAccessActionEnum).optional(),
    groups: z.array(storageAccessActionEnum).optional(),
    entity: z.array(storageAccessActionEnum).optional(),
    resource: z.array(storageAccessActionEnum).optional(),
  })
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

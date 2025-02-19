import z from 'zod';

const noticePredicateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('packageVersion'),
    packageName: z.string(),
    versionRange: z.string(),
  }),
  z.object({
    type: z.literal('backendComponent'),
    backendComponent: z.enum(['data', 'auth', 'function', 'storage']),
  }),
]);

export const noticeSchema = z.object({
  title: z.string(),
  details: z.string(),
  link: z.string(),
  predicates: z.array(noticePredicateSchema),
});

export type Notice = z.infer<typeof noticeSchema>;

export const noticesManifestSchema = z.object({
  currentNotices: z.array(noticeSchema),
});

export type NoticesManifest = z.infer<typeof noticesManifestSchema>;

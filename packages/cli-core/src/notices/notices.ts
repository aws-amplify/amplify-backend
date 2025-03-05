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
  z.object({
    type: z.literal('command'),
    command: z.enum(['sandbox', 'pipeline-deploy', 'generate', 'configure']),
  }),
  z.object({
    type: z.literal('errorMessage'),
    errorMessage: z.string(),
  }),
  z.object({
    type: z.literal('frequency'),
    frequency: z.enum(['command', 'deployment', 'once', 'daily']),
  }),
]);

export const noticeSchema = z.object({
  id: z.string(),
  title: z.string(),
  details: z.string(),
  link: z.string().optional(),
  predicates: z.array(noticePredicateSchema),
});

export type Notice = z.infer<typeof noticeSchema>;

export const noticesManifestSchema = z.object({
  currentNotices: z.array(noticeSchema),
});

export type NoticesManifest = z.infer<typeof noticesManifestSchema>;

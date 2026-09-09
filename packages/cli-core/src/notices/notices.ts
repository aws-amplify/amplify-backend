import z from 'zod';

const noticePredicateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('packageVersion'),
    packageName: z.string(),
    versionRange: z.string(),
  }),
  z.object({
    type: z.literal('nodeVersion'),
    versionRange: z.string(),
  }),
  z.object({
    type: z.literal('osFamily'),
    osFamily: z.enum(['windows', 'macos', 'linux']),
  }),
  z.object({
    type: z.literal('backendComponent'),
    backendComponent: z.enum(['data', 'auth', 'function', 'storage', 'ai']),
  }),
  z.object({
    type: z.literal('command'),
    command: z.enum(['sandbox', 'pipeline-deploy', 'generate', 'configure']),
  }),
  z.object({
    type: z.literal('errorMessage'),
    errorMessage: z.string(),
  }),
]);

export const noticeSchema = z.object({
  id: z.string(),
  title: z.string(),
  details: z.string(),
  link: z.string().optional(),
  predicates: z.array(noticePredicateSchema),
  frequency: z.enum(['command', 'deployment', 'once', 'daily']).optional(),
  validFrom: z.number().optional(),
  validTo: z.number().optional(),
});

export type Notice = z.infer<typeof noticeSchema>;

export const noticesManifestSchema = z.object({
  notices: z.array(noticeSchema),
});

export type NoticesManifest = z.infer<typeof noticesManifestSchema>;

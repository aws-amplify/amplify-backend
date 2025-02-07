import z from 'zod';

export const noticeSchema = z.object({
  title: z.string(),
  details: z.string(),
  link: z.string(),
});

export type Notice = z.infer<typeof noticeSchema>;

export const noticesManifestSchema = z.object({
  currentNotices: z.array(noticeSchema),
});

export type NoticesManifest = z.infer<typeof noticesManifestSchema>;

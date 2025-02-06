import z from 'zod';

export const noticeSchema = z.object({
  id: z.string(),
  title: z.string(),
  details: z.string(),
  link: z.string(),
});

export type Notice = z.infer<typeof noticeSchema>;

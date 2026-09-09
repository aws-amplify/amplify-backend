import { z } from 'zod';

export const aiConversationOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    definedConversationHandlers: z.string(), // JSON array as string
  }),
});

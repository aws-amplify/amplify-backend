import { z } from 'zod';

export const authOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    userPoolId: z.string(),
    webClientId: z.string(),
    identityPoolId: z.string(),
    amazonClientId: z.optional(z.string()),
    appleClientId: z.optional(z.string()),
    facebookClientId: z.optional(z.string()),
    googleClientId: z.optional(z.string()),
    authRegion: z.string(),
  }),
});

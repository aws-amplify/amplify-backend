import { z } from 'zod';

// The values stored in the stack output is converted to string.
export const authOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    authRegion: z.string(),
    userPoolId: z.string(),
    webClientId: z.string(),
    identityPoolId: z.string(),
    amazonClientId: z.optional(z.string()),
    appleClientId: z.optional(z.string()),
    facebookClientId: z.optional(z.string()),
    googleClientId: z.optional(z.string()),

    usernameAttributes: z.string().optional(),
    signupAttributes: z.string().optional(),
    passwordPolicyMinLength: z.string().optional(),
    passwordPolicyRequirements: z.string().optional(),
    mfaConfiguration: z.string().optional(),
    mfaTypes: z.string().optional(),
    verificationMechanisms: z.string().optional(),
  }),
});

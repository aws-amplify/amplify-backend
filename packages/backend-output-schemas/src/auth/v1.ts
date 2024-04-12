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

    allowUnauthenticatedIdentities: z.optional(z.string()), // boolean as string 'true' | 'false'

    usernameAttributes: z.string().optional(), // JSON array as string
    signupAttributes: z.string().optional(), // JSON array as string
    passwordPolicyMinLength: z.string().optional(),
    passwordPolicyRequirements: z.string().optional(), // JSON array as string
    mfaConfiguration: z.string().optional(),
    mfaTypes: z.string().optional(), // JSON array as string
    verificationMechanisms: z.string().optional(), // JSON array as string

    socialProviders: z.string().optional(), // JSON array as string

    oauthCognitoDomain: z.string().optional(),
    oauthScope: z.string().optional(), // JSON array as string
    oauthRedirectSignIn: z.string().optional(),
    oauthRedirectSignOut: z.string().optional(),
    oauthClientId: z.string().optional(),
    oauthResponseType: z.string().optional(),
  }),
});

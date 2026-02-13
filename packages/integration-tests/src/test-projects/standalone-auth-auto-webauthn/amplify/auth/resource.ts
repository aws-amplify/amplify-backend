import { defineAuth } from '@aws-amplify/backend';

/**
 * Auth with WebAuthn AUTO (boolean shorthand) — this should fail
 * under standalone deployment because AUTO cannot resolve without
 * Amplify Hosting.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    webAuthn: true,
  },
});

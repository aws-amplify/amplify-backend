import { defineAuth } from '@aws-amplify/backend';

/**
 * Auth with explicit WebAuthn relyingPartyId for standalone deployments.
 * AUTO is not supported in standalone mode, so we must provide an explicit domain.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    webAuthn: {
      relyingPartyId: 'app.example.com',
    },
  },
});

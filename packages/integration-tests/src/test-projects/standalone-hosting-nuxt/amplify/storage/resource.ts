import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'nuxtSsrTestBucket',
  access: (allow) => ({
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write']),
    ],
  }),
});

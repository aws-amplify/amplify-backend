import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'ssrTestBucket',
  access: (allow) => ({
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write']),
    ],
  }),
});

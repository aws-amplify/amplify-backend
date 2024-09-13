import { defineStorage } from '@aws-amplify/backend-storage';

export const storage = defineStorage({
  name: 'my-awesome-storage',
  access: (allow) => ({
    'foo/*': [
      allow.authenticated.to(['delete', 'write', 'read']),
      allow.guest.to(['delete', 'write', 'read']),
    ],
  }),
});

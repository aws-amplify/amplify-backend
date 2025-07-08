import { defineFunction, defineStorage } from '@aws-amplify/backend';

const onDelete = defineFunction();
const onUpload = defineFunction();
const someFunc = defineFunction();

export const storage = defineStorage({
  name: 'testName',
  isDefault: true,
  versioned: true,
  triggers: {
    onDelete,
    onUpload,
  },
  access: (allow) => ({
    'public/*': [
      allow.resource(someFunc).to(['read', 'write']),
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write']),
      allow.groups(['Admins']).to(['read', 'write', 'delete']),
    ],
    'protected/{entity_id}/*': [
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.groups(['Admins']).to(['read', 'write', 'delete']),
    ],
  }),
});

import { defineStorage } from '@aws-amplify/backend';
import {
  defaultNodeFunc,
  node16Func,
  onDelete,
  onUpload,
} from '../function.js';

export const storage = defineStorage({
  name: 'testName',
  triggers: {
    onDelete,
    onUpload,
  },
  access: (allow) => ({
    'public/*': [
      allow.resource(defaultNodeFunc).to(['read', 'write']),
      allow.resource(node16Func).to(['read', 'write']),
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

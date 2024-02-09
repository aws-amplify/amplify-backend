import { defineStorage } from '@aws-amplify/backend';
import { myFunc } from '../function.js';

export const storage = defineStorage({
  name: 'testName',
  access: (allow) => ({
    '/public/*': [allow.resource(myFunc).to('read', 'write')],
  }),
});

import { defineStorage } from '@aws-amplify/backend';
import { defaultNodeFunc, node16Func } from '../function.js';

export const storage = defineStorage({
  name: 'testName',
  access: (allow) => ({
    '/public/*': [
      allow.resource(defaultNodeFunc).to('read', 'write'),
      allow.resource(node16Func).to('read', 'write'),
    ],
  }),
});

import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { storage } from './storage/resource.js';
import { myFunc } from './function.js';
import { data } from './data/resource.js';

void (async () => {
  await defineBackend({
    auth,
    storage,
    myFunc,
    data,
  });
})();

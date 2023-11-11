import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
import { myFunc } from './function';
import { data } from './data/resource';

defineBackend({
  auth,
  storage,
  myFunc,
  data,
});

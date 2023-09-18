import { Backend } from '@aws-amplify/backend';
import { auth } from './auth.js';
import { storage } from './storage.js';
import { myFunc } from './function.js';
import { data } from './data.js';

new Backend({
  auth,
  storage,
  myFunc,
  data,
});

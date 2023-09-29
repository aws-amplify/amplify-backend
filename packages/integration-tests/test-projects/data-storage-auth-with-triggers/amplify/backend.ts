import { Backend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { storage } from './storage/resource.js';
import { myFunc } from './function.js';
import { data } from './data/resource.js';

new Backend({
  auth,
  storage,
  myFunc,
  data,
});

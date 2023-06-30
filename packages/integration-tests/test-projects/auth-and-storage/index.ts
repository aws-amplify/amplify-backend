import { Backend } from '@aws-amplify/backend';
import { auth } from './auth.js';
import { storage } from './storage.js';

new Backend({
  auth,
  storage,
});

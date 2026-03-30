import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { hosting } from './hosting/resource.js';
import { storage } from './storage/resource.js';

defineBackend({
  auth,
  data,
  hosting,
  storage,
});

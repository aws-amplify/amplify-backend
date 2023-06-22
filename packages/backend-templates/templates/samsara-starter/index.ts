import { Backend } from '@aws-amplify/backend';
import { auth } from './auth';
import { storage } from './storage';

new Backend({
  auth,
  storage,
});

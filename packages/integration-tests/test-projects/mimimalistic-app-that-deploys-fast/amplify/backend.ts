import { Backend } from '@aws-amplify/backend';
import { storage } from './storage/resource.js';

new Backend({
  storage,
});

import { defineBackend } from '@aws-amplify/backend';
import { hosting } from './hosting/resource.js';

defineBackend({
  hosting,
});

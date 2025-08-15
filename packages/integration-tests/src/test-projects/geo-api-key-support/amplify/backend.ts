import { defineBackend } from '@aws-amplify/backend';
import { map, place, collection } from './geo/resource.js';
import { auth } from './auth/resource.js';

defineBackend({
  auth,
  map,
  place,
  collection,
});

import { Backend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';

new Backend({
  auth,
  data,
});

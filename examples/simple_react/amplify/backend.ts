import { Backend } from '@aws-amplify/backend';
import { auth } from './auth.js';
import { data } from './data.js';

new Backend({
  auth,
  data,
});

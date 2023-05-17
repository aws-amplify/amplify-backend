import { auth } from './auth';
import { data } from './data';
import { Backend } from '@aws-amplify/backend';

export const backend = new Backend({
  auth,
  data,
});

import { Backend } from 'aws-amplify-backend';
import { auth } from './auth';
import { data } from './data';

new Backend({
  auth,
  data,
});

import { auth } from './amplify/auth/resource.js';
import { data } from './amplify/data/resource.js';

export const basicAuthDataFactories = {
  auth,
  data,
};

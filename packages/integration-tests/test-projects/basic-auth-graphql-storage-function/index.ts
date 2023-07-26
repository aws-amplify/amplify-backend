import { Backend } from '@aws-amplify/backend';
import { auth } from './auth.js';
import { storage } from './storage.js';
import { myFunc } from './function.js';
import { graphql } from './graphql.js';

new Backend({
  auth,
  storage,
  myFunc,
  graphql,
});

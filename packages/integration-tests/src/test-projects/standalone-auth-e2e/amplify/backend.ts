import { defineBackend } from '@aws-amplify/backend';
import { App } from 'aws-cdk-lib';
import { auth } from './auth/resource.js';

defineBackend(
  {
    auth,
  },
  new App(),
);

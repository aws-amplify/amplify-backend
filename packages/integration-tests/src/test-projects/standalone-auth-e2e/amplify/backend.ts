import { defineBackend } from '@aws-amplify/backend';
import { App } from 'aws-cdk-lib';
import { auth } from './auth/resource.js';

const app = new App();
defineBackend(
  {
    auth,
  },
  { app, stackName: 'StandaloneAuthE2E' },
);

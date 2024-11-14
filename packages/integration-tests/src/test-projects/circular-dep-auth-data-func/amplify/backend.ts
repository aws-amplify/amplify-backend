import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { apiFunction } from './functions/api-function/resource.js';
import { preSignUp } from './functions/pre-sign-up/resource.js';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';

const backend = defineBackend({
  auth,
  data,
  apiFunction,
  preSignUp,
});

const eventSource = new DynamoEventSource(
  backend.data.resources.tables['Todo'],
  {
    startingPosition: StartingPosition.LATEST,
  }
);

backend.apiFunction.resources.lambda.addEventSource(eventSource);

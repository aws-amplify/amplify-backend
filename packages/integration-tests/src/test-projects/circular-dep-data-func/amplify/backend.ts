import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { apiFunction } from './functions/api-function/resource.js';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { queryFunction } from './functions/query-function/resource.js';

const backend = defineBackend({
  auth,
  data,
  apiFunction,
  queryFunction,
});

const eventSource = new DynamoEventSource(
  backend.data.resources.tables['Todo'],
  {
    startingPosition: StartingPosition.LATEST,
  }
);

backend.apiFunction.resources.lambda.addEventSource(eventSource);

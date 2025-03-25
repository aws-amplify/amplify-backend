import { defineBackend, secret } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { apiFunction } from './functions/api-function/resource.js';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { queryFunction } from './functions/query-function/resource.js';
import { customAPIFunction } from './functions/custom-api-function/resource.js';

const backend = defineBackend({
  auth,
  data,
  apiFunction,
  queryFunction,
  customAPIFunction,
});

const eventSource = new DynamoEventSource(
  backend.data.resources.tables['Todo'],
  {
    startingPosition: StartingPosition.LATEST,
  },
);

backend.apiFunction.resources.lambda.addEventSource(eventSource);
backend.customAPIFunction.addEnvironment(
  'GRAPHQL_ENDPOINT',
  backend.data.graphqlUrl,
);
backend.customAPIFunction.addEnvironment('TEST_SECRET', secret('amazonSecret'));

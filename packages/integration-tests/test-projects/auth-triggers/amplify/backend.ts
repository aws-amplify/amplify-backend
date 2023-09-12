import { Backend } from '@aws-amplify/backend';
import { auth, func } from './auth.js';
import { data } from './data.js';

const backend = new Backend({ auth, data, func });
backend.resources.func.resources.lambda.addEnvironment(
  'API_ID',
  backend.resources.data.resources.graphqlApi.apiId
);

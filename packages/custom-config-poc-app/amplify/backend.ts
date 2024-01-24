import { defineBackend } from '@aws-amplify/backend';
import { myFunc } from './function';
import {
  ApiKeySourceType,
  Cors,
  LambdaIntegration,
  RestApi,
  UsagePlan,
} from 'aws-cdk-lib/aws-apigateway';
import * as process from "process";
import { auth } from "./auth/resource";

const backend = defineBackend({
  auth,
  myFunc,
});

const stack = backend.createStack('APIGateway');

const api = new RestApi(stack, 'TestRestApi', {
  restApiName: 'TestRestApi',
  description: 'TestRestApi',
  apiKeySourceType: ApiKeySourceType.HEADER,
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
  },
});

const lambdaIntegration = new LambdaIntegration(
  backend.myFunc.resources.lambda,
  {
    allowTestInvoke: true,
  }
);

api.root.addMethod('GET', lambdaIntegration, {
  apiKeyRequired: true,
});

const apiKeyValue = process.env.CUSTOM_CONFIG_POC_APP_API_KEY;
if (!apiKeyValue) {
  throw new Error('API Key must be provided in CUSTOM_CONFIG_POC_APP_API_KEY env var');
}

const apiKey = api.addApiKey('TestRestApiKey', {
  value: apiKeyValue,
});

const usagePlan = new UsagePlan(stack, 'UsagePlan', {
  name: 'Test Usage Plan',
  apiStages: [
    {
      api,
      stage: api.deploymentStage,
    },
  ],
});

usagePlan.addApiKey(apiKey);

backend.setCustomOutput('myApiUrl', api.url);
backend.setCustomOutput('myApiKey', apiKeyValue);

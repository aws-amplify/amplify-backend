import { defineBackend } from '@aws-amplify/backend';
import { myFunc } from './function';
import {
  ApiKeySourceType,
  Cors,
  LambdaIntegration,
  RestApi,
  UsagePlan,
} from 'aws-cdk-lib/aws-apigateway';

const backend = defineBackend({
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

const apiKey = api.addApiKey('TestRestApiKey', {
  value: 'REDACTED',
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

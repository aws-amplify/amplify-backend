import { defineBackend } from '@aws-amplify/backend';
import { myFunc } from './function';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as process from 'process';
import { auth } from './auth/resource';
import * as locationAlpha from '@aws-cdk/aws-location-alpha';
import * as location from 'aws-cdk-lib/aws-location';
import * as iam from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  myFunc,
});

// ####### API Gateway + Lambda Start #######

const apiGatewayStack = backend.createStack('APIGateway');

const api = new apigateway.RestApi(apiGatewayStack, 'TestRestApi', {
  restApiName: 'TestRestApi',
  description: 'TestRestApi',
  apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
  },
});

const lambdaIntegration = new apigateway.LambdaIntegration(
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
  throw new Error(
    'API Key must be provided in CUSTOM_CONFIG_POC_APP_API_KEY env var'
  );
}

const apiKey = api.addApiKey('TestRestApiKey', {
  value: apiKeyValue,
});

const usagePlan = new apigateway.UsagePlan(apiGatewayStack, 'UsagePlan', {
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

// ####### API Gateway + Lambda END #######

// ####### Geo Start #######

const locationStack = backend.createStack('Location');

const testMapStyle = 'VectorEsriNavigation';
const testMap = new location.CfnMap(locationStack, 'TestMap', {
  mapName: 'myTestMap',
  configuration: {
    style: testMapStyle
  }
});

new iam.Policy(locationStack, 'myTestMapPolicy', {
  policyName: 'myTestMapPolicy',
  roles: [backend.auth.resources.authenticatedUserIamRole],
  statements: [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['geo:GetMapStyleDescriptor', 'geo:GetMapGlyphs', 'geo:GetMapSprites', 'geo:GetMapTile'],
      resources: [testMap.attrArn],
    }),
  ]
});

backend.setCustomOutput('myTestMapRegion', locationStack.region, {
  clientConfigDestinations: [
    {
      // TODO figure out if we really need per client config type here
      // See comments in packages/backend/src/backend.ts
      clientConfigFormat: 'json',
      path: ['geo', 'amazon_location_service', 'region']
    }
  ]
});
backend.setCustomOutput('myTestMapName', testMap.mapName, {
  clientConfigDestinations: [
    {
      clientConfigFormat: 'json',
      path: ['geo', 'amazon_location_service', 'maps', 'default']
    }
  ]
});
backend.setCustomOutput('myTestMapStyle', testMapStyle, {
  clientConfigDestinations: [
    {
      clientConfigFormat: 'json',
      path: ['geo', 'amazon_location_service', 'maps', 'items', testMap.mapName, 'style']
    }
  ]
});

// ####### Geo End #######

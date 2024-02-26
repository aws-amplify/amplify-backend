import { defineBackend } from '@aws-amplify/backend';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Lazy } from 'aws-cdk-lib';

const backend = defineBackend({});

const customStack = backend.createStack('customStack');

const restApi = new RestApi(customStack, 'TestRestApi');
restApi.root.addMethod('GET');

const someConstant1 = 'someHardCodedValue1';
const someConstant2 = 'someHardCodedValue2';

backend.addOutput({
  custom: {
    // test deploy time values
    restApiUrl: restApi.url,
    // test hard-coded values
    someConstant1,
  },
});

backend.addOutput({
  custom: {
    // test synth time values
    // and composition of config
    someConstant2: Lazy.string({ produce: () => someConstant2 }),
  },
});

const fakeCognitoUserPoolId = 'fakeCognitoUserPoolId';
backend.addOutput({
  // test reserved key
  auth: {
    user_pool_id: fakeCognitoUserPoolId,
  },
});

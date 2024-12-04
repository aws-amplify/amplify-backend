import { defineBackend } from '@aws-amplify/backend';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Lazy } from 'aws-cdk-lib';

const backend = defineBackend({});

const customStack = backend.createStack('customStack');

const restApi = new RestApi(customStack, 'TestRestApi');
restApi.root.addMethod('GET');

const someConstant1 = 'someHardCodedValue1';
const someConstant2 = 'someHardCodedValue2';
const sampleRegion = 'test_region';
const sampleIdentityPoolId = 'test_identity_pool_id';
const sampleUserPoolClientId = 'test_user_pool_client_id';

backend.addOutput({
  version: '1.3',
  custom: {
    // test deploy time values
    restApiUrl: restApi.url,
    // test hard-coded values
    someConstant1,
  },
});

backend.addOutput({
  version: '1.3',
  custom: {
    // test synth time values
    // and composition of config
    someConstant2: Lazy.string({ produce: () => someConstant2 }),
  },
});

const fakeCognitoUserPoolId = 'fakeCognitoUserPoolId';
backend.addOutput({
  version: '1.3',
  // test reserved key
  auth: {
    aws_region: sampleRegion,
    identity_pool_id: sampleIdentityPoolId,
    user_pool_client_id: sampleUserPoolClientId,
    user_pool_id: fakeCognitoUserPoolId,
  },
});

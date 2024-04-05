import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { RemovalPolicy } from 'aws-cdk-lib';

const backend = defineBackend({
  auth,
  data,
});

const simpleAuthStack = backend.createStack('simple-auth');

const simpleAuthUserPool = new cognito.UserPool(
  simpleAuthStack,
  'SimpleAuthUserPool',
  {
    removalPolicy: RemovalPolicy.DESTROY,
  }
);

const simpleAuthUserPoolClient = new cognito.UserPoolClient(
  simpleAuthStack,
  'SimpleAuthUserPoolClient',
  {
    userPool: simpleAuthUserPool,
    authFlows: {
      userPassword: true,
    },
  }
);

const simpleAuthIdentityPool = new cognito.CfnIdentityPool(
  simpleAuthStack,
  'SimpleAuthIdentityPool',
  {
    allowUnauthenticatedIdentities: false,
  }
);

simpleAuthIdentityPool.cognitoIdentityProviders = [
  {
    clientId: simpleAuthUserPoolClient.userPoolClientId,
    providerName: `cognito-idp.${simpleAuthStack.region}.amazonaws.com/${simpleAuthUserPool.userPoolId}`,
  },
];

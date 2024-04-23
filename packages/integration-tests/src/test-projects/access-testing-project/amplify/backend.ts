import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { RemovalPolicy } from 'aws-cdk-lib';
import {
  AccountPrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
} from 'aws-cdk-lib/aws-iam';

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

const iamRolesStack = backend.createStack('iam-roles');

const roleWithAccessToData = new Role(iamRolesStack, 'RoleWithAccessToData', {
  assumedBy: new AccountPrincipal(iamRolesStack.account),
  path: '/',
  inlinePolicies: {
    root: new PolicyDocument({
      statements: [
        new PolicyStatement({
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
          ],
          resources: ['arn:aws:logs:*:*:*'],
          effect: Effect.ALLOW,
        }),
      ],
    }),
  },
});
roleWithAccessToData.applyRemovalPolicy(RemovalPolicy.DESTROY);
roleWithAccessToData.addToPolicy(
  new PolicyStatement({
    actions: ['appsync:GraphQL'],
    resources: [`${backend.data.resources.graphqlApi.arn}/*`],
    effect: Effect.ALLOW,
  })
);

const roleWithoutAccessToData = new Role(
  iamRolesStack,
  'RoleWithoutAccessToData',
  {
    assumedBy: new AccountPrincipal(iamRolesStack.account),
    path: '/',
    inlinePolicies: {
      root: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents',
            ],
            resources: ['arn:aws:logs:*:*:*'],
            effect: Effect.ALLOW,
          }),
        ],
      }),
    },
  }
);
roleWithoutAccessToData.applyRemovalPolicy(RemovalPolicy.DESTROY);

backend.addOutput({
  custom: {
    roleWithAccessToDataArn: roleWithAccessToData.roleArn,
    roleWithoutAccessToDataArn: roleWithoutAccessToData.roleArn,
    simpleAuthUserPoolId: simpleAuthUserPool.userPoolId,
    simpleAuthUserPoolClientId: simpleAuthUserPoolClient.userPoolClientId,
    simpleAuthIdentityPoolId: simpleAuthIdentityPool.ref,
    authRoleArn: backend.auth.resources.authenticatedUserIamRole.roleArn,
    unAuthRoleArn: backend.auth.resources.unauthenticatedUserIamRole.roleArn,
  },
});

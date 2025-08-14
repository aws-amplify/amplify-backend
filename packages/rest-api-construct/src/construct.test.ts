import { describe, it } from 'node:test';
import { RestApiConstruct } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { defineFunction } from '@aws-amplify/backend';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ResourceNameValidatorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { ConstructFactoryGetInstanceProps } from '@aws-amplify/plugin-types';
import assert from 'node:assert';
import { RestApiPathConfig } from './types.js';
import { handler } from './test-assets/handler.js';
import { Context } from 'aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';

const setupExampleLambda = (stack: Stack) => {
  const factory = defineFunction({
    name: 'Test Function',
    entry: './test-assets/handler.ts',
  });

  //stubs for the instance props
  const constructContainer = new ConstructContainerStub(
    new StackResolverStub(stack),
  );
  const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
    stack,
  );
  const resourceNameValidator = new ResourceNameValidatorStub();
  const getInstanceProps: ConstructFactoryGetInstanceProps = {
    constructContainer,
    outputStorageStrategy,
    resourceNameValidator,
  };

  return factory.getInstance(getInstanceProps);
};

const constructApiWithPath = (path: string, n: number = 1) => {
  if (n < 0) n = 0;
  const stack = new Stack(new App());
  const resource = setupExampleLambda(stack);
  if (n == 0)
    return new RestApiConstruct(stack, 'testApi0', {
      apiName: 'testApi0',
      apiProps: [],
    });
  const apiProp: RestApiPathConfig = {
    lambdaEntry: resource,
    methods: [{ method: 'GET', authorizer: { type: 'none' } }],
    path: path,
  };
  const apiProps: RestApiPathConfig[] = [];
  for (let x = 0; x < n; x++) {
    apiProps.push(apiProp);
  }
  return new RestApiConstruct(stack, 'testApi1', {
    apiName: 'testApi1',
    apiProps: apiProps,
  });
};

void describe('RestApiConstruct User Pool Handling', () => {
  void it('attaches a Cognito authorizer when a user pool is provided', () => {
    const app = new App();
    const stack = new Stack(app);

    // Create a test Cognito user pool
    const userPool = new cognito.UserPool(stack, 'TestUserPool', {
      userPoolName: 'test-pool',
    });

    // Setup a Lambda to attach to the API
    const lambdaResource = setupExampleLambda(stack);

    // Create the API with a GET method using user pool authorization
    new RestApiConstruct(
      stack,
      'RestApiWithAuth',
      {
        apiName: 'RestApiWithAuth',
        apiProps: [
          {
            path: '/test',
            lambdaEntry: lambdaResource,
            methods: [
              { method: 'GET', authorizer: { type: 'userPool' } },
              { method: 'POST', authorizer: { type: 'userPool' } },
            ],
          },
        ],
      },
      userPool,
    );

    const template = Template.fromStack(stack); // <-- use Template here

    // Check that the GET method has the proper Cognito user pool auth
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      AuthorizationType: apiGateway.AuthorizationType.COGNITO, // this is COGNITO_USER_POOLS
      HttpMethod: 'GET',
    });

    // Check that the POST method also has the proper Cognito user pool auth
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      AuthorizationType: apiGateway.AuthorizationType.COGNITO,
      HttpMethod: 'POST',
    });

    // Optionally, check that authorizer is correctly attached
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      AuthorizerId: { Ref: 'RestApiWithAuthDefaultUserPoolAuth0006E5FA' }, // CDK auto-generated ID
    });
  });

  void it('does not create an authorizer if no user pool is passed', () => {
    const stack = new Stack(new App());
    const lambdaResource = setupExampleLambda(stack);

    new RestApiConstruct(stack, 'RestApiWithoutAuth', {
      apiName: 'RestApiWithoutAuth',
      apiProps: [
        {
          path: '/test',
          lambdaEntry: lambdaResource,
          methods: [{ method: 'GET', authorizer: { type: 'none' } }],
        },
      ],
    });

    const template = Template.fromStack(stack); // <-- use Template here

    // GET method should be open (no auth)
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      AuthorizationType: apiGateway.AuthorizationType.NONE,
      HttpMethod: 'GET',
    });
  });
});

void describe('RestApiConstruct Lambda Handling', () => {
  void it('integrates the result of defineFunction into the api', () => {
    const app = new App();
    const stack = new Stack(app);
    const resource = setupExampleLambda(stack);

    new RestApiConstruct(stack, 'RestApiTest', {
      apiName: 'RestApiTest',
      apiProps: [
        {
          path: '/items',
          lambdaEntry: resource,
          methods: [
            {
              method: 'GET',
              authorizer: { type: 'none' },
            },
          ],
        },
      ],
    });
  });
});

void describe('RestApiConstruct Error Handling', () => {
  void it('throws an error if any of the rest api paths are invalid', () => {
    assert.throws(
      () => constructApiWithPath('no/leading/slash'),
      'NoLeadingSlashError',
    );
    assert.throws(
      () => constructApiWithPath('/an/ending/slash/'),
      'TrailingSlashError',
    );
    assert.throws(
      () => constructApiWithPath('/a/double//slash'),
      'DoubleSlashError',
    );
    assert.throws(() => constructApiWithPath(''), 'EmptyPathError');

    assert.throws(
      () => constructApiWithPath('/no/paths/provided', 0),
      'NoPathsError',
    );
    assert.throws(
      () => constructApiWithPath('/a/duplicate', 2),
      'DuplicatePathError',
    );

    assert.doesNotThrow(() => constructApiWithPath('/a/valid/path'));
  });
});

void describe('Handler testing', () => {
  void it('test function works and returns hello world', async () => {
    const mockContext: Context = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'testFunction',
      functionVersion: '1',
      invokedFunctionArn:
        'arn:aws:lambda:us-east-1:123456789012:function:testFunction',
      memoryLimitInMB: '128',
      awsRequestId: 'testRequestId',
      logGroupName: '/aws/lambda/testFunction',
      logStreamName: '2021/01/01/[$LATEST]a',
      getRemainingTimeInMillis: () => 1000,
      done: () => {},
      fail: () => {},
      succeed: () => {},
    };
    const result = await handler(null, mockContext, () => {});
    assert.equal(result, 'Hello, World!');
  });
});

//test needs to be updated to new lambda handling
// void describe('RestApiConstruct', () => {
//   void it('creates a queue if specified', () => {
//     const app = new App();
//     const stack = new Stack(app);
//     new RestApiConstruct(stack, 'RestApiTest', {
//       apiName: 'RestApiTest',
//       apiProps: [
//         {
//           path: '/test',
//           methods: [
//             {
//               method: 'GET',
//               authorizer: { type: 'none' },
//             },
//           ],
//           lambdaEntry: {
//             runtime: lambda.Runtime.NODEJS_18_X,
//             source: {
//               path: './test-lambda',
//             },
//           },
//         },
//         {
//           path: '/blog',
//           methods: [
//             {
//               method: 'POST',
//               authorizer: { type: 'userPool', groups: ['Admins'] },
//             },
//             {
//               method: 'GET',
//               authorizer: { type: 'userPool' },
//             },
//           ],
//           defaultAuthorizer: { type: 'userPool' },
//           lambdaEntry: {
//             runtime: lambda.Runtime.NODEJS_18_X,
//             source: {
//               path: './blog-lambda',
//             },
//           },
//         },
//       ],
//     });
//     const template = Template.fromStack(stack);
//     template.resourceCountIs('AWS::AGW::RestApi', 1);
//   });
// });

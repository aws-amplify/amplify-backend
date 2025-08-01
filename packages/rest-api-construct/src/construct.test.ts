import { describe, it } from 'node:test';
import { RestApiConstruct } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';

void describe('RestApiConstruct Lambda Handling', () => {
  void it('loads an existing local lambda function if the directory is specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new RestApiConstruct(stack, 'RestApiLambdaTest', {
      apiName: 'RestApiLambdaTest',
      apiProps: [
        {
          path: 'items',
          defaultAuthorizer: { type: 'none' },
          methods: [
            {
              method: 'GET',
              authorizer: { type: 'none' },
            },
          ],
          lambdaEntry: {
            runtime: lambda.Runtime.NODEJS_18_X,
            source: { path: 'packages/rest-api-construct/lib/test-assets' },
          },
        },
      ],
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
  });

  void it('creates a new lambda function if the code is specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new RestApiConstruct(stack, 'RestApiNewLambdaTest', {
      apiName: 'RestApiNewLambda',
      apiProps: [
        {
          path: 'items',
          defaultAuthorizer: { type: 'none' },
          methods: [
            {
              method: 'GET',
              authorizer: { type: 'none' },
            },
          ],
          lambdaEntry: {
            runtime: lambda.Runtime.NODEJS_22_X,
            source: {
              code: "export const handler = () => {return 'Hello World! This is a new lambda function.';};",
            },
          },
        },
      ],
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
  });
});

void describe('RestApiConstruct', () => {
  void it('creates a queue if specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new RestApiConstruct(stack, 'RestApiTest', {
      apiName: 'RestApiTest',
      apiProps: [
        {
          path: '/test',
          methods: [
            {
              method: 'GET',
              authorizer: { type: 'none' },
            },
          ],
          lambdaEntry: {
            runtime: lambda.Runtime.NODEJS_18_X,
            source: {
              path: './test-lambda',
            },
          },
        },
        {
          path: '/blog',
          methods: [
            {
              method: 'POST',
              authorizer: { type: 'userPool', groups: ['Admins'] },
            },
            {
              method: 'GET',
              authorizer: { type: 'userPool' },
            },
          ],
          defaultAuthorizer: { type: 'userPool' },
          lambdaEntry: {
            runtime: lambda.Runtime.NODEJS_18_X,
            source: {
              path: './blog-lambda',
            },
          },
        },
      ],
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::AGW::RestApi', 1);
  });
});

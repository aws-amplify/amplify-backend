import { describe, it } from 'node:test';
import { RestApiConstruct } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';

void describe('RestApiConstruct', () => {
  void it('loads a function if the folder is specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new RestApiConstruct(stack, 'RestApiLambdaTest', {
      apiName: 'RestApiLambdaTest',
      apiProps: [
        {
          path: 'items',
          routes: ['GET'],
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
          routes: ['GET', 'POST'],
          lambdaEntry: {
            runtime: lambda.Runtime.NODEJS_18_X,
            source: {
              path: './test-lambda',
            },
          },
        },
        {
          path: '/blog',
          routes: ['GET', 'POST', 'PUT'],
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

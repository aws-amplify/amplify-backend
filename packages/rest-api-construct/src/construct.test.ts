import { describe, it } from 'node:test';
import { RestApiConstruct } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';

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

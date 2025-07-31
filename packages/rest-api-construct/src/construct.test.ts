import { describe, it } from 'node:test';
import { RestApiConstruct } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { strictEqual } from 'assert';
import * as fs from 'fs';

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
              functionName: 'MyFunction1',
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

  void it('creates local files for a new function if the code is specified', () => {
    //delete folder amplify/functions/MyFunction2 first if the test has failed

    //function files should not originally exist
    let src = process.cwd();
    src += '/amplify/functions/MyFunction2/';
    strictEqual(fs.existsSync(src + 'resource.ts'), false);
    strictEqual(fs.existsSync(src + 'handler.ts'), false);

    //create the api containing a new lambda from source code
    const app = new App();
    const stack = new Stack(app);
    new RestApiConstruct(stack, 'RestApiNewLambda2', {
      apiName: 'RestApiNewLambda2',
      apiProps: [
        {
          path: 'items',
          methods: ['GET'],
          lambdaEntry: {
            runtime: lambda.Runtime.NODEJS_22_X,
            source: {
              functionName: 'MyFunction2',
              code: "export const handler = () => {return 'Hello World! This is a new lambda function.';};",
            },
          },
        },
      ],
    });

    //function files should have been created
    strictEqual(fs.existsSync(src + 'resource.ts'), true);
    strictEqual(fs.existsSync(src + 'handler.ts'), true);
  });

  void it('loads a function from aws if the id and name are specified', () => {
    const app = new App();
    const funcStack = new Stack(app, 'funcStack');

    const func = new lambda.Function(funcStack, 'testFunc', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        "export const handler = () => {return 'Hello World! This is an existing lambda function.';};",
      ),
    });

    const stack = new Stack(app, 'stack');
    new RestApiConstruct(stack, 'RestApiLoadFunc', {
      apiName: 'RestApiLoad',
      apiProps: [
        {
          path: 'stuff',
          methods: ['GET'],
          lambdaEntry: {
            runtime: lambda.Runtime.NODEJS_22_X,
            source: { id: func.functionArn, name: func.functionName },
          },
        },
      ],
    });

    const template = Template.fromStack(stack);
    //there should be no functions in the stack
    template.resourcePropertiesCountIs(
      'AWS::Lambda::Function',
      { Arn: func.functionArn },
      0,
    );
    //should be allowed to call the function
    template.hasResourceProperties('AWS::Lambda::Permission', {
      Action: 'lambda:InvokeFunction',
      Principal: 'apigateway.amazonaws.com',
      FunctionName: { 'Fn::GetAtt': [func.functionName, 'Arn'] },
    });
    //api should reference ARN
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      Integration: {
        Uri: {
          'Fn::Sub': [
            'arn:aws:apigateway:${AWS::REGION}:lambda:path/2015-03-31/functions/${LambdaArn}/invocations',
            { LambdaArn: func.functionArn },
          ],
        },
      },
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

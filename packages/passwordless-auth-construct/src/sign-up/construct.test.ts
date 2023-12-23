import { describe, test } from 'node:test';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyAuth } from '@aws-amplify/auth-construct-alpha';
import { AmplifyPasswordlessAuth } from '../construct.js';
import { AmplifyPasswordlessSignUp } from './construct.js';

void describe('Passwordless Sign Up', () => {
  void test('Enable passwordless sign up', () => {
    const app = new App();
    const stack = new Stack(app);
    const auth = new AmplifyAuth(stack, 'testAuth', {
      loginWith: { email: true },
    });
    const authPasswordless = new AmplifyPasswordlessAuth(stack, 'test', auth, {
      magicLink: {
        allowedOrigins: [],
        email: { fromAddress: 'foo@example.com' },
      },
    });

    new AmplifyPasswordlessSignUp(stack, `signup-passwordless`, {
      userPool: auth.resources.userPool,
      // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
      verifyAuthChallengeResponseExecutionRole:
        authPasswordless.verifyAuthChallengeResponse.role!,
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Description: 'This service creates users.',
      Name: 'Create User service',
    });
    template.hasResourceProperties('AWS::ApiGateway::Stage', {
      StageName: 'prod',
    });

    // CORS enabled
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      ApiKeyRequired: false,
      AuthorizationType: 'NONE',
      HttpMethod: 'OPTIONS',
      Integration: {
        IntegrationResponses: [
          {
            ResponseParameters: {
              'method.response.header.Access-Control-Allow-Headers':
                "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Methods':
                "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
            },
            StatusCode: '204',
          },
        ],
        RequestTemplates: {
          'application/json': '{ statusCode: 200 }',
        },
        Type: 'MOCK',
      },
      MethodResponses: [
        {
          ResponseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
          },
          StatusCode: '204',
        },
      ],
    });

    // PUT method
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      AuthorizationType: 'NONE',
      HttpMethod: 'PUT',
      Integration: {
        IntegrationHttpMethod: 'POST',
        RequestTemplates: {
          'application/json': '{ "statusCode": "200" }',
        },
        Type: 'AWS_PROXY',
        Uri: Match.anyValue(),
      },
    });
  });
});

import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { App, Duration, Stack } from 'aws-cdk-lib';
import {
  AmplifyData,
  AmplifyDataDefinition,
} from '@aws-amplify/data-construct';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { convertJsResolverDefinition } from './convert_js_resolvers.js';
import { a } from '@aws-amplify/data-schema';

// stub schema for the AmplifyApi construct
// not relevant to this test suite
const testSchema = /* GraphQL */ `
  type Todo @model {
    id: ID!
  }
`;

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('convertJsResolverDefinition', () => {
  let stack: Stack;
  let amplifyApi: AmplifyData;
  const authorizationModes = { apiKeyConfig: { expires: Duration.days(7) } };

  void beforeEach(() => {
    stack = createStackAndSetContext();
    amplifyApi = new AmplifyData(stack, 'amplifyData', {
      apiName: 'amplifyData',
      definition: AmplifyDataDefinition.fromString(testSchema),
      authorizationModes,
    });
  });

  void it('handles empty array / undefined param', () => {
    assert.doesNotThrow(() =>
      convertJsResolverDefinition(stack, amplifyApi, undefined)
    );
    assert.doesNotThrow(() =>
      convertJsResolverDefinition(stack, amplifyApi, [])
    );
  });

  void it('handles jsFunction IR with a single function', () => {
    const absolutePath = resolve(
      fileURLToPath(import.meta.url),
      '../../lib/assets',
      'js_resolver_handler.js'
    );

    const schema = a.schema({
      customQuery: a
        .query()
        .authorization((allow) => allow.publicApiKey())
        .returns(a.string())
        .handler(
          a.handler.custom({
            entry: absolutePath,
          })
        ),
    });
    const { jsFunctions } = schema.transform();
    convertJsResolverDefinition(stack, amplifyApi, jsFunctions);

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
      Runtime: {
        Name: 'APPSYNC_JS',
        RuntimeVersion: '1.0.0',
      },
      DataSourceName: 'NONE_DS',
      Name: 'Fn_Query_customQuery_1',
    });

    const expectedFnCount = 1;
    template.resourceCountIs(
      'AWS::AppSync::FunctionConfiguration',
      expectedFnCount
    );

    template.hasResourceProperties('AWS::AppSync::Resolver', {
      Runtime: {
        Name: 'APPSYNC_JS',
        RuntimeVersion: '1.0.0',
      },
      Kind: 'PIPELINE',
      TypeName: 'Query',
      FieldName: 'customQuery',
    });

    template.resourceCountIs('AWS::AppSync::Resolver', 1);
  });

  void it('handles jsFunction IR with multiple functions', () => {
    const absolutePath = resolve(
      fileURLToPath(import.meta.url),
      '../../lib/assets',
      'js_resolver_handler.js'
    );

    const schema = a.schema({
      customQuery: a
        .query()
        .authorization((allow) => allow.publicApiKey())
        .returns(a.string())
        .handler([
          a.handler.custom({
            entry: absolutePath,
          }),
          a.handler.custom({
            entry: absolutePath,
          }),
          a.handler.custom({
            entry: absolutePath,
          }),
        ]),
    });
    const { jsFunctions } = schema.transform();
    convertJsResolverDefinition(stack, amplifyApi, jsFunctions);

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
      Runtime: {
        Name: 'APPSYNC_JS',
        RuntimeVersion: '1.0.0',
      },
      DataSourceName: 'NONE_DS',
      Name: 'Fn_Query_customQuery_1',
    });

    const expectedFnCount = 3;
    template.resourceCountIs(
      'AWS::AppSync::FunctionConfiguration',
      expectedFnCount
    );

    template.hasResourceProperties('AWS::AppSync::Resolver', {
      Runtime: {
        Name: 'APPSYNC_JS',
        RuntimeVersion: '1.0.0',
      },
      Kind: 'PIPELINE',
      TypeName: 'Query',
      FieldName: 'customQuery',
    });

    template.resourceCountIs('AWS::AppSync::Resolver', 1);
  });
});

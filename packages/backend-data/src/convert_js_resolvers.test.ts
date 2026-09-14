import { Match, Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { App, Duration, Stack } from 'aws-cdk-lib';
import {
  AmplifyData,
  AmplifyDataDefinition,
} from '@aws-amplify/data-construct';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  convertJsResolverDefinition,
  defaultJsResolverCode,
} from './convert_js_resolvers.js';
import { a } from '@aws-amplify/data-schema';
import { writeFileSync } from 'node:fs';

// stub schema for the AmplifyApi construct
// not relevant to this test suite
const testSchema = /* GraphQL */ `
  type Todo @model {
    id: ID!
  }
`;

const createStackAndSetContext = (backendType: 'sandbox' | 'branch'): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', backendType);
  const stack = new Stack(app);
  return stack;
};

void describe('defaultJsResolverCode', () => {
  void it('returns the default JS resolver code with api id and env name in valid JS', async () => {
    const code = defaultJsResolverCode('testApiId', 'testEnvName');
    assert(code.includes("ctx.stash.awsAppsyncApiId = 'testApiId';"));
    assert(
      code.includes("ctx.stash.amplifyApiEnvironmentName = 'testEnvName';"),
    );

    const tempDir = tmpdir();
    const filename = join(tempDir, 'js_resolver_handler.js');
    writeFileSync(filename, code);

    // windows requires dynamic imports to use file urls
    const fileUrl = pathToFileURL(filename).href;
    const resolver = await import(fileUrl);
    const context = { stash: {}, prev: { result: 'result' } };
    assert.deepEqual(resolver.request(context), {});

    // assert api id and env name are added to the context stash
    assert.deepEqual(context.stash, {
      awsAppsyncApiId: 'testApiId',
      amplifyApiEnvironmentName: 'testEnvName',
    });
    assert.equal(resolver.response(context), 'result');
  });
});

void describe('convertJsResolverDefinition - branch deployment', () => {
  let stack: Stack;
  let amplifyApi: AmplifyData;
  const authorizationModes = { apiKeyConfig: { expires: Duration.days(7) } };

  void beforeEach(() => {
    stack = createStackAndSetContext('branch');
    amplifyApi = new AmplifyData(stack, 'amplifyData', {
      apiName: 'amplifyData',
      definition: AmplifyDataDefinition.fromString(testSchema),
      authorizationModes,
    });
  });

  void it('handles empty array / undefined param', () => {
    assert.doesNotThrow(() =>
      convertJsResolverDefinition(stack, amplifyApi, undefined),
    );
    assert.doesNotThrow(() =>
      convertJsResolverDefinition(stack, amplifyApi, []),
    );
  });

  void it('handles jsFunction IR with a single function', () => {
    const absolutePath = resolve(
      fileURLToPath(import.meta.url),
      '../../lib/assets',
      'js_resolver_handler.js',
    );

    const schema = a.schema({
      customQuery: a
        .query()
        .authorization((allow) => allow.publicApiKey())
        .returns(a.string())
        .handler(
          a.handler.custom({
            entry: absolutePath,
          }),
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
      expectedFnCount,
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
      'js_resolver_handler.js',
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
      expectedFnCount,
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

  void it('adds api id and environment name to stash for non-sandbox deployment', () => {
    const absolutePath = resolve(
      fileURLToPath(import.meta.url),
      '../../lib/assets',
      'js_resolver_handler.js',
    );

    const schema = a.schema({
      customQuery: a
        .query()
        .authorization((allow) => allow.publicApiKey())
        .returns(a.string())
        .handler(
          a.handler.custom({
            entry: absolutePath,
          }),
        ),
    });
    const { jsFunctions } = schema.transform();
    convertJsResolverDefinition(stack, amplifyApi, jsFunctions);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::AppSync::Resolver', {
      Runtime: {
        Name: 'APPSYNC_JS',
        RuntimeVersion: '1.0.0',
      },
      Kind: 'PIPELINE',
      TypeName: 'Query',
      FieldName: 'customQuery',
      Code: {
        'Fn::Join': [
          '',
          [
            "/**\n * Pipeline resolver request handler\n */\nexport const request = (ctx) => {\n    ctx.stash.awsAppsyncApiId = '",
            {
              'Fn::GetAtt': [
                Match.stringLikeRegexp('amplifyDataGraphQLAPI.*'),
                'ApiId',
              ],
            },
            "';\n    ctx.stash.amplifyApiEnvironmentName = 'testEnvName';\n    return {};\n};\n/**\n * Pipeline resolver response handler\n */\nexport const response = (ctx) => {\n    return ctx.prev.result;\n};\n",
          ],
        ],
      },
    });
  });
});

void describe('convertJsResolverDefinition - sandbox deployment', () => {
  let stack: Stack;
  let amplifyApi: AmplifyData;
  const authorizationModes = { apiKeyConfig: { expires: Duration.days(7) } };

  void beforeEach(() => {
    stack = createStackAndSetContext('sandbox');
    amplifyApi = new AmplifyData(stack, 'amplifyData', {
      apiName: 'amplifyData',
      definition: AmplifyDataDefinition.fromString(testSchema),
      authorizationModes,
    });
  });

  void it('adds api id and environment name to stash', () => {
    const absolutePath = resolve(
      fileURLToPath(import.meta.url),
      '../../lib/assets',
      'js_resolver_handler.js',
    );

    const schema = a.schema({
      customQuery: a
        .query()
        .authorization((allow) => allow.publicApiKey())
        .returns(a.string())
        .handler(
          a.handler.custom({
            entry: absolutePath,
          }),
        ),
    });
    const { jsFunctions } = schema.transform();
    convertJsResolverDefinition(stack, amplifyApi, jsFunctions);

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::AppSync::Resolver', {
      Runtime: {
        Name: 'APPSYNC_JS',
        RuntimeVersion: '1.0.0',
      },
      Kind: 'PIPELINE',
      TypeName: 'Query',
      FieldName: 'customQuery',
      Code: {
        'Fn::Join': [
          '',
          [
            "/**\n * Pipeline resolver request handler\n */\nexport const request = (ctx) => {\n    ctx.stash.awsAppsyncApiId = '",
            {
              'Fn::GetAtt': [
                Match.stringLikeRegexp('amplifyDataGraphQLAPI.*'),
                'ApiId',
              ],
            },
            "';\n    ctx.stash.amplifyApiEnvironmentName = 'NONE';\n    return {};\n};\n/**\n * Pipeline resolver response handler\n */\nexport const response = (ctx) => {\n    return ctx.prev.result;\n};\n",
          ],
        ],
      },
    });
  });
});

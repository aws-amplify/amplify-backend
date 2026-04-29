import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { App, Duration, NestedStack, Stack } from 'aws-cdk-lib';
import {
  AmplifyData,
  AmplifyDataDefinition,
} from '@aws-amplify/data-construct';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  convertJsResolverDefinition,
  resolveNestedStackId,
} from './convert_js_resolvers.js';
import { a } from '@aws-amplify/data-schema';

const testSchema = /* GraphQL */ `
  type Todo @model {
    id: ID!
  }
`;

void describe('resolveNestedStackId', () => {
  void it('capitalizes the first character of targetStackName', () => {
    const result = resolveNestedStackId('amplifyData', 'orders');
    assert.strictEqual(result, 'amplifyDataCustomOrders');
  });

  void it('works correctly when targetStackName is already capitalized', () => {
    const result = resolveNestedStackId('amplifyData', 'Orders');
    assert.strictEqual(result, 'amplifyDataCustomOrders');
  });

  void it('works with a single character targetStackName', () => {
    const result = resolveNestedStackId('amplifyData', 'a');
    assert.strictEqual(result, 'amplifyDataCustomA');
  });

  void it('works with numbers and special characters in targetStackName', () => {
    const result = resolveNestedStackId('amplifyData', 'stack1_new');
    assert.strictEqual(result, 'amplifyDataCustomStack1_new');
  });

  void it('handles empty baseName', () => {
    const result = resolveNestedStackId('', 'orders');
    assert.strictEqual(result, 'CustomOrders');
  });
});

const createStackAndSetContext = (backendType: 'sandbox' | 'branch'): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', backendType);
  const stack = new Stack(app);
  return stack;
};

void describe('convertJsResolverDefinition - partitioning', () => {
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

  void it('partitions resolvers into nested stacks based on customResolverStackMap', () => {
    const absolutePath = resolve(
      fileURLToPath(import.meta.url),
      '../../lib/assets',
      'js_resolver_handler.js',
    );

    const schema = a.schema({
      queryOne: a
        .query()
        .authorization((allow) => allow.publicApiKey())
        .returns(a.string())
        .handler(
          a.handler.custom({
            entry: absolutePath,
          }),
        ),
      queryTwo: a
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

    // Assign queryTwo to 'orders' stack
    const customResolverStackMap = {
      'Query.queryTwo': 'orders',
    } as const;

    convertJsResolverDefinition(
      stack,
      amplifyApi,
      jsFunctions,
      customResolverStackMap,
    );

    // Verify main stack
    const mainTemplate = Template.fromStack(stack);
    mainTemplate.hasResourceProperties('AWS::AppSync::Resolver', {
      FieldName: 'queryOne',
      TypeName: 'Query',
    });

    // Verify queryTwo is NOT in the main stack
    mainTemplate.resourceCountIs('AWS::AppSync::Resolver', 1);

    // Verify nested stack existence
    const nestedStackId = resolveNestedStackId(amplifyApi.node.id, 'orders');
    const nestedStack = stack.node.findChild(nestedStackId) as NestedStack;

    // Verify queryTwo is in the nested stack
    const nestedTemplate = Template.fromStack(nestedStack);
    nestedTemplate.hasResourceProperties('AWS::AppSync::Resolver', {
      FieldName: 'queryTwo',
      TypeName: 'Query',
    });

    nestedTemplate.hasResourceProperties(
      'AWS::AppSync::FunctionConfiguration',
      {
        Name: 'Fn_Query_queryTwo_1',
      },
    );
  });
});

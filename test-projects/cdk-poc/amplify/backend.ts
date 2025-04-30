import { a, AmplifyStack } from '@aws-amplify/backend';
import { App, Duration, NestedStack, Stack } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { UserPool, UserPoolOperation } from 'aws-cdk-lib/aws-cognito';
import { AmplifyAuth } from '@aws-amplify/auth-construct';
import { AmplifyData } from '@aws-amplify/data-construct';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// TODO this should live somewhere else - data package or data schema ?
import { convertSchemaToCDK2 } from '@aws-amplify/backend-data';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const app = new App();

// POC 1 - retain gen2 stacks.

// Can be any stack ?
const mainStack = new AmplifyStack(app, {
  type: 'sandbox',
  name: 'foo',
  namespace: 'bar',
});

const authStack = new NestedStack(mainStack, 'auth');
const dataStack = new NestedStack(mainStack, 'data');

const amplifyAuth = new AmplifyAuth(authStack, 'amplifyAuth', {
  loginWith: {
    email: true,
  },
});

const someFunction = new NodejsFunction(mainStack, 'some-function', {
  entry: path.join(dirname, 'some-function.ts'),
  runtime: Runtime.NODEJS_22_X,
});

(amplifyAuth.resources.userPool as UserPool).addTrigger(
  UserPoolOperation.POST_CONFIRMATION,
  someFunction,
);

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
  Query: a
    .query()
    .arguments({ content: a.string() })
    .returns(a.string())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function('someFunction')),
});

new AmplifyData(dataStack, 'data', {
  // TODO a.schema right now is coupled to gen2 DX.
  // for example it's using DefineFunction return types
  // it would need to consume IFunction instead or so.
  // plus any similar places (like conversation handler).
  //
  // Also see 'convertSchemaToCDK' in packages/backend-data/src/convert_schema.ts
  // to gauge complexity of this...
  //
  // Update:
  // TODO this convertSchemaToCDK2 should live in data construct or data schema.
  // probably construct in form of AmplifyDataDefinition.fromSchema
  // assuming we kill every ConstructFactory typing in data schema.
  // or we throw if schema is using gen2.
  definition: convertSchemaToCDK2(schema),
  authorizationModes: {
    defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
    userPoolConfig: {
      userPool: amplifyAuth.resources.userPool,
    },
    apiKeyConfig: {
      expires: Duration.days(7),
    },
  },
  functionNameMap: {
    someFunction: someFunction,
  },
  // This could have better name if used in docs.
  // With Amplify Auth this was internalized by passing this via cdk context.
  outputStorageStrategy: new StackMetadataBackendOutputStorageStrategy(
    mainStack,
  ),
  translationBehavior: {
    // It would be great if CDK cli could set context flag (or so) that it's using hotswap deployment.
    _provisionHotswapFriendlyResources: true,
  },
});

// outputs?
// https://stackoverflow.com/questions/56835557/aws-cdk-post-deployment-actions
// https://github.com/aws/aws-cdk-rfcs/issues/228

// Or perhaps.
// npx ampx generate from stack name ?
// or ampx generate from CDK outputs
// or custom resource ? (sandbox latency...).
// or have amplify-js being able to read cdk outputs.

// POC 2 - no amplify stacks

const ordinaryStack = new Stack(app, 'some-ordinary-stack');

const someFunction2 = new NodejsFunction(ordinaryStack, 'some-function2', {
  entry: path.join(dirname, 'some-function.ts'),
  runtime: Runtime.NODEJS_22_X,
});

const amplifyAuth2 = new AmplifyAuth(ordinaryStack, 'amplifyAuth2', {
  loginWith: {
    email: true,
  },

  // This could have better name if used in docs.
  outputStorageStrategy: new StackMetadataBackendOutputStorageStrategy(
    ordinaryStack,
  ),
});

(amplifyAuth2.resources.userPool as UserPool).addTrigger(
  UserPoolOperation.POST_CONFIRMATION,
  someFunction2,
);

const schema2 = a.schema({
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
  Query: a
    .query()
    .arguments({ content: a.string() })
    .returns(a.string())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function('someFunction2')),
});

new AmplifyData(ordinaryStack, 'data2', {
  // TODO a.schema right now is coupled to gen2 DX.
  // for example it's using DefineFunction return types
  // it would need to consume IFunction instead or so.
  // plus any similar places (like conversation handler).
  //
  // Also see 'convertSchemaToCDK' in packages/backend-data/src/convert_schema.ts
  // to gauge complexity of this...
  //
  // Update:
  // TODO this convertSchemaToCDK2 should live in data construct or data schema.
  // probably construct in form of AmplifyDataDefinition.fromSchema
  // assuming we kill every ConstructFactory typing in data schema.
  // or we throw if schema is using gen2.
  definition: convertSchemaToCDK2(schema2),
  authorizationModes: {
    defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
    userPoolConfig: {
      userPool: amplifyAuth2.resources.userPool,
    },
    apiKeyConfig: {
      expires: Duration.days(7),
    },
  },
  functionNameMap: {
    someFunction2: someFunction2,
  },
  // This could have better name if used in docs.
  outputStorageStrategy: new StackMetadataBackendOutputStorageStrategy(
    ordinaryStack,
  ),
  translationBehavior: {
    // It would be great if CDK cli could set context flag (or so) that it's using hotswap deployment.
    _provisionHotswapFriendlyResources: true,
  },
});

// Lack of `sandbox` deployment type seems to be killing deployment time.

// Try custom resource

// I wasn't able to make it work.

// const outputStack = new Stack(app, 'output-stack');
//
// new AmplifyClientConfigConstruct(outputStack, ordinaryStack);

// Note: in this POC we probably drop BackendSecret, it's not used at CDK L3 layer anyway.

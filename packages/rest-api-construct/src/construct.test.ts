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

void describe('RestApiConstruct Lambda Handling', () => {
  void it('integrates the result of defineFunction into the api', () => {
    const app = new App();
    const stack = new Stack(app);
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

    const resource = factory.getInstance(getInstanceProps);

    new RestApiConstruct(stack, 'RestApiTest', {
      apiName: 'RestApiTest',
      apiProps: [
        {
          path: 'items',
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

import { dataStorageAuthWithTriggers } from '../test-projects/data-storage-auth-with-triggers-ts/amplify/test_factories.js';
import {
  assertStableLogicalIds,
  defineBackendTemplateHarness,
} from '../define_backend_template_harness.js';
import { it } from 'node:test';

void it('data storage auth with triggers', () => {
  const templates = defineBackendTemplateHarness(dataStorageAuthWithTriggers);

  assertStableLogicalIds(templates.root, 'AWS::CloudFormation::Stack', [
    'auth179371D7',
    'data7552DF31',
    'function1351588B',
    'storage0EC3F24A',
  ]);

  assertStableLogicalIds(templates.auth, 'AWS::Cognito::UserPool', [
    'amplifyAuthUserPool4BA7F805',
  ]);

  assertStableLogicalIds(templates.data, 'AWS::AppSync::GraphQLApi', [
    'amplifyDataGraphQLAPI42A6FA33',
  ]);
  assertStableLogicalIds(templates.data, 'AWS::CloudFormation::Stack', [
    'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833',
    'amplifyDataFunctionDirectiveStackNestedStackFunctionDirectiveStackNestedStackResource1246A302',
    'amplifyDataTodoNestedStackTodoNestedStackResource551CEA56',
  ]);

  assertStableLogicalIds(templates.storage, 'AWS::S3::Bucket', [
    'amplifyStorageamplifyStorageBucketC2F702CD',
  ]);
});

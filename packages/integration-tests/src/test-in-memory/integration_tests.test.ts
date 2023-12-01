import { dataStorageAuthWithTriggers } from '../test-projects/data-storage-auth-with-triggers-ts/amplify/test_factories.js';
import {
  assertStableLogicalIds,
  defineBackendTemplateHarness,
} from '../define_backend_template_harness.js';
import { it } from 'node:test';
import { dataWithoutAuth } from '../test-projects/standalone-data-auth-modes/amplify/test_factories.js';
import { dataWithoutAuthNoAuthMode } from '../test-projects/standalone-data-sandbox-mode/amplify/test_factories.js';

/**
 * This test suite is meant to provide a fast feedback loop to sanity check that different feature verticals are working properly together.
 * Specific feature configurations should be checked at the unit test level.
 * Some assertions about how feature verticals interact could be appropriate here.
 * Critical path interactions should be exercised in a full e2e test.
 */

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

void it('data without auth with lambda auth mode', () => {
  const templates = defineBackendTemplateHarness(dataWithoutAuth);

  assertStableLogicalIds(templates.root, 'AWS::CloudFormation::Stack', [
    'data7552DF31',
    'function1351588B',
  ]);
  assertStableLogicalIds(templates.data, 'AWS::AppSync::GraphQLApi', [
    'amplifyDataGraphQLAPI42A6FA33',
  ]);
  assertStableLogicalIds(templates.data, 'AWS::CloudFormation::Stack', [
    'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833',
    'amplifyDataTodoNestedStackTodoNestedStackResource551CEA56',
  ]);
});

void it('data without auth with default auth mode', () => {
  const templates = defineBackendTemplateHarness(dataWithoutAuthNoAuthMode);

  assertStableLogicalIds(templates.root, 'AWS::CloudFormation::Stack', [
    'data7552DF31',
  ]);
  assertStableLogicalIds(templates.data, 'AWS::AppSync::GraphQLApi', [
    'amplifyDataGraphQLAPI42A6FA33',
  ]);
  assertStableLogicalIds(templates.data, 'AWS::CloudFormation::Stack', [
    'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833',
    'amplifyDataTodoNestedStackTodoNestedStackResource551CEA56',
  ]);
});

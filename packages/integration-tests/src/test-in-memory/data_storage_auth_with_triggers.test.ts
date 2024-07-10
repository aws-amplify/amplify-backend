import { it } from 'node:test';
import {
  assertExpectedLogicalIds,
  synthesizeBackendTemplates,
} from '../define_backend_template_harness.js';
import { dataStorageAuthWithTriggers } from '../test-projects/data-storage-auth-with-triggers-ts/amplify/test_factories.js';

/**
 * This test suite is meant to provide a fast feedback loop to sanity check that different feature verticals are working properly together.
 * Specific feature configurations should be checked at the unit test level.
 * Some assertions about how feature verticals interact could be appropriate here.
 * Critical path interactions should be exercised in a full e2e test.
 */

void it('data storage auth with triggers', () => {
  const templates = synthesizeBackendTemplates(dataStorageAuthWithTriggers);

  assertExpectedLogicalIds(templates.root, 'AWS::CloudFormation::Stack', [
    'auth179371D7',
    'data7552DF31',
    'function1351588B',
    'storage0EC3F24A',
  ]);

  assertExpectedLogicalIds(templates.auth, 'AWS::Cognito::UserPool', [
    'amplifyAuthUserPool4BA7F805',
  ]);

  assertExpectedLogicalIds(templates.data, 'AWS::AppSync::GraphQLApi', [
    'amplifyDataGraphQLAPI42A6FA33',
  ]);
  assertExpectedLogicalIds(templates.data, 'AWS::CloudFormation::Stack', [
    'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833',
    'amplifyDataFunctionDirectiveStackNestedStackFunctionDirectiveStackNestedStackResource1246A302',
    'amplifyDataTodoNestedStackTodoNestedStackResource551CEA56',
  ]);

  /* eslint-disable spellcheck/spell-checker */
  assertExpectedLogicalIds(templates.storage, 'AWS::S3::Bucket', [
    'testNameBucketB4152AD5',
  ]);

  assertExpectedLogicalIds(templates.storage, 'Custom::S3BucketNotifications', [
    'testNameBucketNotificationsB9BE9A01',
  ]);

  assertExpectedLogicalIds(templates.storage, 'AWS::Lambda::Permission', [
    'testNameBucketAllowBucketNotificationsToamplifytestAppIdtestBranchNamebranch7d6f6c854afunctiononDeletelambda572CB9D7EA473960',
    'testNameBucketAllowBucketNotificationsToamplifytestAppIdtestBranchNamebranch7d6f6c854afunctiononUploadlambda74F01BD6AFF08959',
  ]);

  assertExpectedLogicalIds(templates.defaultNodeFunc, 'AWS::Lambda::Function', [
    'defaultNodeFunctionlambda5C194062',
    'echoFunclambdaE17DCA46',
    'funcWithAwsSdklambda5F770AD7',
    'funcWithSchedulelambda0B6E4271',
    'funcWithSsmlambda6A8824A1',
    'handler2lambda1B9C7EFF',
    'node16Functionlambda97ECC775',
    'onUploadlambdaA252C959',
    'onDeletelambda96BB6F15',
  ]);
  /* eslint-enable spellcheck/spell-checker */
});

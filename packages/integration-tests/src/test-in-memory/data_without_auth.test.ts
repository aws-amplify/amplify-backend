import { it } from 'node:test';
import {
  assertExpectedLogicalIds,
  synthesizeBackendTemplates,
} from '../define_backend_template_harness.js';
import { dataWithoutAuth } from '../test-projects/standalone-data-auth-modes/amplify/test_factories.js';

/**
 * This test suite is meant to provide a fast feedback loop to sanity check that different feature verticals are working properly together.
 * Specific feature configurations should be checked at the unit test level.
 * Some assertions about how feature verticals interact could be appropriate here.
 * Critical path interactions should be exercised in a full e2e test.
 */

void it('data without auth with lambda auth mode', () => {
  const templates = synthesizeBackendTemplates(dataWithoutAuth);

  assertExpectedLogicalIds(templates.root, 'AWS::CloudFormation::Stack', [
    'data7552DF31',
    'function1351588B',
  ]);
  assertExpectedLogicalIds(templates.data, 'AWS::AppSync::GraphQLApi', [
    'amplifyDataGraphQLAPI42A6FA33',
  ]);
  assertExpectedLogicalIds(templates.data, 'AWS::CloudFormation::Stack', [
    'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833',
    'amplifyDataTodoNestedStackTodoNestedStackResource551CEA56',
  ]);
});

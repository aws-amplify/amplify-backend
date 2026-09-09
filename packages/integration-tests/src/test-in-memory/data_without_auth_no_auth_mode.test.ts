import { it } from 'node:test';
import {
  assertExpectedLogicalIds,
  synthesizeBackendTemplates,
} from '../define_backend_template_harness.js';
import { dataWithoutAuthNoAuthMode } from '../test-projects/standalone-data-sandbox-mode/amplify/test_factories.js';

/**
 * This test suite is meant to provide a fast feedback loop to sanity check that different feature verticals are working properly together.
 * Specific feature configurations should be checked at the unit test level.
 * Some assertions about how feature verticals interact could be appropriate here.
 * Critical path interactions should be exercised in a full e2e test.
 */

void it('data without auth with default auth mode', () => {
  const templates = synthesizeBackendTemplates(dataWithoutAuthNoAuthMode);

  assertExpectedLogicalIds(templates.root, 'AWS::CloudFormation::Stack', [
    'data7552DF31',
  ]);
  assertExpectedLogicalIds(templates.data, 'AWS::AppSync::GraphQLApi', [
    'amplifyDataGraphQLAPI42A6FA33',
  ]);
  assertExpectedLogicalIds(templates.data, 'AWS::CloudFormation::Stack', [
    'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833',
    'amplifyDataTodoNestedStackTodoNestedStackResource551CEA56',
  ]);
});

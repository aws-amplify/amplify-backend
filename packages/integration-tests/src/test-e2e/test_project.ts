import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { DataStorageAuthWithTriggerTestProjectCreator } from './data_storage_auth_with_triggers.js';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { MinimalWithTypescriptIdiomTestProjectCreator } from './minimal_with_typescript_idioms.js';
import { TestProjectCreator } from './test_project_creator.js';

/**
 * Generates a list of test projects.
 */
export const getTestProjectCreators = (): TestProjectCreator[] => {
  const testProjectCreators: TestProjectCreator[] = [];
  const cfnClient = new CloudFormationClient();
  const secretClient = getSecretClient();
  testProjectCreators.push(
    new DataStorageAuthWithTriggerTestProjectCreator(cfnClient, secretClient),
    new MinimalWithTypescriptIdiomTestProjectCreator(cfnClient)
  );
  return testProjectCreators;
};

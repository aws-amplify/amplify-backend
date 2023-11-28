import { TestProjectBase } from './test_project_base.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { DataStorageAuthWithTriggerTestProjectCreator } from './data_storage_auth_with_triggers.js';
import { MinimalWithTypescriptIdiomTestProjectCreator } from './minimal_with_typescript_idioms.js';
import { LambdaClient } from '@aws-sdk/client-lambda';

export type TestProjectCreator = {
  readonly name: string;
  createProject: (e2eProjectDir: string) => Promise<TestProjectBase>;
};

/**
 * Generates a list of test projects.
 */
export const getTestProjectCreators = (): TestProjectCreator[] => {
  const testProjectCreators: TestProjectCreator[] = [];
  const cfnClient = new CloudFormationClient();
  const lambdaClient = new LambdaClient();
  const secretClient = getSecretClient();
  testProjectCreators.push(
    new DataStorageAuthWithTriggerTestProjectCreator(
      cfnClient,
      secretClient,
      lambdaClient
    ),
    new MinimalWithTypescriptIdiomTestProjectCreator(cfnClient)
  );
  return testProjectCreators;
};

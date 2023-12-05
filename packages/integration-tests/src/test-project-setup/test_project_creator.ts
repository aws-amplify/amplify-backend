import { TestProjectBase } from './test_project_base.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { DataStorageAuthWithTriggerTestProjectCreator } from './data_storage_auth_with_triggers.js';
import { MinimalWithTypescriptIdiomTestProjectCreator } from './minimal_with_typescript_idioms.js';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { fromIni } from '@aws-sdk/credential-providers';

export type TestProjectCreator = {
  readonly name: string;
  createProject: (e2eProjectDir: string) => Promise<TestProjectBase>;
};

/**
 * Generates a list of test projects.
 */
export const getTestProjectCreators = (): TestProjectCreator[] => {
  // When running in CI/CD, load the e2e tooling credentials from the 'e2e-tooling' profile
  // When running locally, load credentials using the default credential provider
  // We load credentials for e2e-tooling from a separate profile so that we can isolate permissions required to run Gen2 commands
  // vs permissions required to orchestrate test setup, teardown, and assertions.
  const e2eToolingClientConfig = process.env.CI
    ? {
        credentials: fromIni({ profile: 'e2e-tooling' }),
      }
    : {};
  const testProjectCreators: TestProjectCreator[] = [];

  const cfnClient = new CloudFormationClient(e2eToolingClientConfig);
  const lambdaClient = new LambdaClient(e2eToolingClientConfig);
  const resourceFinder = new DeployedResourcesFinder(cfnClient);
  const secretClient = getSecretClient(e2eToolingClientConfig);
  testProjectCreators.push(
    new DataStorageAuthWithTriggerTestProjectCreator(
      cfnClient,
      secretClient,
      lambdaClient,
      resourceFinder
    ),
    new MinimalWithTypescriptIdiomTestProjectCreator(cfnClient)
  );
  return testProjectCreators;
};

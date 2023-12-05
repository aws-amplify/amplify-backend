import { TestProjectBase } from './test_project_base.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { DataStorageAuthWithTriggerTestProjectCreator } from './data_storage_auth_with_triggers.js';
import { MinimalWithTypescriptIdiomTestProjectCreator } from './minimal_with_typescript_idioms.js';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { PasswordlessAuthTestProjectCreator } from './passwordless_auth.js';

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
  const resourceFinder = new DeployedResourcesFinder(cfnClient);
  const secretClient = getSecretClient();
  const cognitoIdentityProviderClient = new CognitoIdentityProviderClient();
  testProjectCreators.push(
    new DataStorageAuthWithTriggerTestProjectCreator(
      cfnClient,
      secretClient,
      lambdaClient,
      resourceFinder
    ),
    new MinimalWithTypescriptIdiomTestProjectCreator(cfnClient),
    new PasswordlessAuthTestProjectCreator(
      cfnClient,
      cognitoIdentityProviderClient,
      resourceFinder
    )
  );
  return testProjectCreators;
};

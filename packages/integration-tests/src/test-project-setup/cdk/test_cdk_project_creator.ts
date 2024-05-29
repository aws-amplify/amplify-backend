import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import { TestCdkProjectBase } from './test_cdk_project_base.js';
import { AuthTestCdkProjectCreator } from './auth_cdk_project.js';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { DeployedResourcesFinder } from '../../find_deployed_resource.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
export const testCdkProjectsSourceRoot = path.resolve(
  dirname,
  '..',
  '..',
  '..',
  'src',
  'test-cdk-projects'
);

export type TestCdkProjectCreator = {
  readonly name: string;
  createProject: (e2eProjectDir: string) => Promise<TestCdkProjectBase>;
};

/**
 * Generates a list of test cdk projects.
 */
export const getTestCdkProjectCreators = (): TestCdkProjectCreator[] => {
  const testCdkProjectCreators: TestCdkProjectCreator[] = [];

  const cfnClient = new CloudFormationClient(e2eToolingClientConfig);
  const resourceFinder = new DeployedResourcesFinder(cfnClient);
  testCdkProjectCreators.push(new AuthTestCdkProjectCreator(resourceFinder));
  return testCdkProjectCreators;
};

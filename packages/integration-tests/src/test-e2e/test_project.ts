import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { DataStorageAuthWithTriggerTestProject } from './data_storage_auth_with_triggers.js';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { createTestDirectory } from '../setup_test_directory.js';
import { TestProjectBase } from './test_project_base.js';
import { MinimalWithTypescriptIdiomTestProject } from './minimalist-project-with-typescript-idioms.js';

/**
 * Generates a list of test projects.
 */
export const generateTestProjects = async (
  e2eProjectDir: string
): Promise<TestProjectBase[]> => {
  const testProjects: TestProjectBase[] = [];
  const cfnClient = new CloudFormationClient();
  const secretClient = getSecretClient();
  await createTestDirectory(e2eProjectDir);
  testProjects.push(
    await DataStorageAuthWithTriggerTestProject.createProject(
      e2eProjectDir,
      cfnClient,
      secretClient
    ),
    await MinimalWithTypescriptIdiomTestProject.createProject(
      e2eProjectDir,
      cfnClient
    )
  );
  return testProjects;
};

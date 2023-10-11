import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { DataStorageAuthWithTriggerTestProject } from './data_storage_auth_with_triggers.js';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { createTestDirectory } from '../setup_test_directory.js';

export type TestProject = {
  readonly name: string;
  readonly projectDirPath: string;
  readonly projectAmplifyDirPath: string;
  assertDeployment: () => Promise<void>;
  setUpDeployEnvironment: (backendId: UniqueBackendIdentifier) => Promise<void>;
  clearDeployEnvironment: (backendId: UniqueBackendIdentifier) => Promise<void>;
  deploy: (backendIdentifier: UniqueBackendIdentifier) => Promise<void>;
  tearDown: (backendIdentifier: UniqueBackendIdentifier) => Promise<void>;
};

/**
 * Generates a list of test projects.
 */
export const generateTestProjects = async (
  e2eProjectDir: string
): Promise<TestProject[]> => {
  const testProjects: TestProject[] = [];
  const cfnClient = new CloudFormationClient();
  const secretClient = getSecretClient();
  await createTestDirectory(e2eProjectDir);
  testProjects.push(
    await DataStorageAuthWithTriggerTestProject.createProject(
      e2eProjectDir,
      cfnClient,
      secretClient
    )
  );
  return testProjects;
};

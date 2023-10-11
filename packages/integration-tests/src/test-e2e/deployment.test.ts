import { after, describe, it } from 'node:test';
import { deleteTestDirectory, rootTestDir } from '../setup_test_directory.js';
import { shortUuid } from '../short_uuid.js';
import { generateTestProjects } from './test_project.js';
import {
  BranchBackendIdentifier,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { userInfo } from 'os';

const testProjects = await generateTestProjects(rootTestDir);

void describe('amplify deploys', async () => {
  after(async () => {
    await deleteTestDirectory(rootTestDir);
  });

  testProjects.forEach((testProject) => {
    void describe(`amplify deploys ${testProject.name}`, () => {
      const sandboxBackendId = new SandboxBackendIdentifier(
        `${testProject.name}-${userInfo().username}`
      );
      const branchBackendId = new BranchBackendIdentifier(
        `test-${shortUuid()}`,
        'test-pipeline-branch'
      );

      [sandboxBackendId, branchBackendId].forEach((backendIdentifier) => {
        void it(`environment - ${backendIdentifier.disambiguator}`, async () => {
          try {
            await testProject.setUpDeployEnvironment(backendIdentifier);
            await testProject.deploy(backendIdentifier);
            await testProject.assertDeployment();
          } finally {
            await testProject.tearDown(backendIdentifier);
            await testProject.clearDeployEnvironment(backendIdentifier);
          }
        });
      });
    });
  });
});

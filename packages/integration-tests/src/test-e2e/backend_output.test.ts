import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { getTestProjectCreators } from '../test-project-setup/test_project_creator.js';
import {
  createTestDirectory,
  deleteTestDirectory,
} from '../setup_test_directory.js';
import { fileURLToPath } from 'node:url';
import { testConcurrencyLevel } from './test_concurrency.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { TestProjectBase } from '../test-project-setup/test_project_base.js';
import { userInfo } from 'node:os';

const testProjectCreators = getTestProjectCreators();

// Different root test dir to avoid race conditions with e2e deployment tests
const rootTestDir = fileURLToPath(
  new URL('./e2e-outputs-tests', import.meta.url)
);

void describe(
  'backend output tests',
  { concurrency: testConcurrencyLevel },
  () => {
    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('amplify deploys', async () => {
      const testProjectCreator = testProjectCreators[0];

      void describe(`sandbox deploys ${testProjectCreator.name}`, () => {
        let sandboxBackendIdentifier: BackendIdentifier;
        let testProject: TestProjectBase;

        beforeEach(async () => {
          testProject = await testProjectCreator.createProject(rootTestDir);
          sandboxBackendIdentifier = {
            namespace: testProject.name,
            name: userInfo().username,
            type: 'sandbox',
          };
        });

        afterEach(async () => {
          await testProject.tearDown(sandboxBackendIdentifier);
        });

        void it('deploys fully and stack outputs are readable by backend client', async () => {
          await testProject.deploy(sandboxBackendIdentifier);
          await testProject.assertPostDeployment(sandboxBackendIdentifier);

          await testProject.assertDeployedClientOutputs(
            sandboxBackendIdentifier
          );
        });
      });
    });
  }
);

import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { getTestProjectCreators } from '../test-project-setup/test_project_creator.js';
import {
  createTestDirectory,
  deleteTestDirectory,
} from '../setup_test_directory.js';
import { fileURLToPath } from 'node:url';
import { testConcurrencyLevel } from './test_concurrency.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import { TestProjectBase } from '../test-project-setup/test_project_base.js';
import assert from 'node:assert';

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

      void describe(`branch deploys ${testProjectCreator.name}`, () => {
        let branchBackendIdentifier: BackendIdentifier;
        let testBranch: TestBranch;
        let testProject: TestProjectBase;

        beforeEach(async () => {
          testProject = await testProjectCreator.createProject(rootTestDir);
          testBranch = await amplifyAppPool.createTestBranch();
          branchBackendIdentifier = {
            namespace: testBranch.appId,
            name: testBranch.branchName,
            type: 'branch',
          };
        });

        afterEach(async () => {
          await testProject.tearDown(branchBackendIdentifier);
        });

        void it('deploys fully and stack outputs are readable by backend client', async () => {
          await testProject.deploy(branchBackendIdentifier);
          await testProject.assertPostDeployment(branchBackendIdentifier);
          const testBranchDetails = await amplifyAppPool.fetchTestBranchDetails(
            testBranch
          );
          assert.ok(
            testBranchDetails.backend?.stackArn,
            'branch should have stack associated'
          );
          assert.ok(
            testBranchDetails.backend?.stackArn?.includes(
              branchBackendIdentifier.namespace
            )
          );
          assert.ok(
            testBranchDetails.backend?.stackArn?.includes(
              branchBackendIdentifier.name
            )
          );

          await testProject.assertDeployedClientOutputs(
            branchBackendIdentifier
          );
        });
      });
    });
  }
);

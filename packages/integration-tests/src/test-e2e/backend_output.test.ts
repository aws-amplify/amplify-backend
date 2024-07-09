import { after, before, describe, it } from 'node:test';
import { getTestProjectCreators } from '../test-project-setup/test_project_creator.js';
import {
  createTestDirectory,
  deleteTestDirectory,
} from '../setup_test_directory.js';
import { fileURLToPath } from 'node:url';
import { testConcurrencyLevel } from './test_concurrency.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { TestProjectBase } from '../test-project-setup/test_project_base.js';
import {
  amplifySharedSecretNameKey,
  createAmplifySharedSecretName,
} from '../shared_secret.js';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';

const testProjectCreators = getTestProjectCreators();

// Different root test dir to avoid race conditions with e2e deployment tests
const rootTestDir = fileURLToPath(
  new URL('../e2e-outputs-tests', import.meta.url)
);

void describe(
  'backend output tests',
  { concurrency: testConcurrencyLevel },
  () => {
    const testProjectCreator = testProjectCreators[0];
    let branchBackendIdentifier: BackendIdentifier;
    let testBranch: TestBranch;
    let testProject: TestProjectBase;

    before(async () => {
      await createTestDirectory(rootTestDir);
      testProject = await testProjectCreator.createProject(rootTestDir);
      testBranch = await amplifyAppPool.createTestBranch();
      branchBackendIdentifier = {
        namespace: testBranch.appId,
        name: testBranch.branchName,
        type: 'branch',
      };
    });
    after(async () => {
      await testProject.tearDown(branchBackendIdentifier);
      await deleteTestDirectory(rootTestDir);
    });

    void it('deploys fully and stack outputs are readable by backend client', async () => {
      const sharedSecretsEnv = {
        [amplifySharedSecretNameKey]: createAmplifySharedSecretName(),
      };
      await testProject.deploy(branchBackendIdentifier, sharedSecretsEnv);
      await testProject.assertPostDeployment(branchBackendIdentifier);

      await testProject.assertDeployedClientOutputs(branchBackendIdentifier);
    });
  }
);

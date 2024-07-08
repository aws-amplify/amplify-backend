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
import { userInfo } from 'node:os';
import {
  amplifySharedSecretNameKey,
  createAmplifySharedSecretName,
} from '../shared_secret.js';

const testProjectCreators = getTestProjectCreators();

// Different root test dir to avoid race conditions with e2e deployment tests
const rootTestDir = fileURLToPath(
  new URL('./e2e-outputs-tests', import.meta.url)
);

void describe(
  'backend output tests',
  { concurrency: testConcurrencyLevel },
  () => {
    const testProjectCreator = testProjectCreators[0];
    let sandboxBackendIdentifier: BackendIdentifier;
    let testProject: TestProjectBase;

    before(async () => {
      await createTestDirectory(rootTestDir);
      testProject = await testProjectCreator.createProject(rootTestDir);
      sandboxBackendIdentifier = {
        namespace: testProject.name,
        name: userInfo().username + '1',
        type: 'sandbox',
      };
    });
    after(async () => {
      await testProject.tearDown(sandboxBackendIdentifier);
      await deleteTestDirectory(rootTestDir);
    });

    void it('deploys fully and stack outputs are readable by backend client', async () => {
      const sharedSecretsEnv = {
        [amplifySharedSecretNameKey]: createAmplifySharedSecretName(),
      };
      await testProject.deploy(sandboxBackendIdentifier, sharedSecretsEnv);
      await testProject.assertPostDeployment(sandboxBackendIdentifier);

      await testProject.assertDeployedClientOutputs(sandboxBackendIdentifier);
    });
  }
);

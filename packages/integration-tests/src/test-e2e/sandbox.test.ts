import { after, before, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../setup_test_directory.js';
import { getTestProjectCreators } from '../test-project-setup/test_project_creator.js';
import { TestProjectBase } from '../test-project-setup/test_project_base.js';
import { userInfo } from 'os';
import { ampxCli } from '../process-controller/process_controller.js';
import {
  ensureDeploymentTimeLessThan,
  interruptSandbox,
  rejectCleanupSandbox,
  replaceFiles,
  waitForConfigUpdateAfterDeployment,
} from '../process-controller/predicated_action_macros.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { testConcurrencyLevel } from './test_concurrency.js';
import {
  amplifySharedSecretNameKey,
  createAmplifySharedSecretName,
} from '../shared_secret.js';

const testProjectCreators = getTestProjectCreators();
void describe('sandbox tests', { concurrency: testConcurrencyLevel }, () => {
  before(async () => {
    await createTestDirectory(rootTestDir);
  });
  after(async () => {
    await deleteTestDirectory(rootTestDir);
  });

  void describe('amplify deploys', async () => {
    testProjectCreators.forEach((testProjectCreator) => {
      void describe(`sandbox deploys ${testProjectCreator.name}`, () => {
        let testProject: TestProjectBase;
        let sandboxBackendIdentifier: BackendIdentifier;

        before(async () => {
          testProject = await testProjectCreator.createProject(rootTestDir);
          sandboxBackendIdentifier = {
            type: 'sandbox',
            namespace: testProject.name,
            name: userInfo().username,
          };
        });

        after(async () => {
          await testProject.tearDown(sandboxBackendIdentifier);
        });

        void describe('in sequence', { concurrency: false }, () => {
          const sharedSecretsEnv = {
            [amplifySharedSecretNameKey]: createAmplifySharedSecretName(),
          };
          void it(`[${testProjectCreator.name}] deploys fully`, async () => {
            await testProject.deploy(
              sandboxBackendIdentifier,
              sharedSecretsEnv
            );
            await testProject.assertPostDeployment(sandboxBackendIdentifier);
          });

          void it('generates config after sandbox --once deployment', async () => {
            const processController = ampxCli(
              ['sandbox', '--once'],
              testProject.projectDirPath,
              {
                env: sharedSecretsEnv,
              }
            );
            await processController
              .do(waitForConfigUpdateAfterDeployment())
              .run();

            await testProject.assertPostDeployment(sandboxBackendIdentifier);
          });

          void it(`[${testProjectCreator.name}] hot-swaps a change`, async () => {
            const updates = await testProject.getUpdates();
            if (updates.length > 0) {
              const processController = ampxCli(
                ['sandbox', '--dirToWatch', 'amplify'],
                testProject.projectDirPath,
                {
                  env: sharedSecretsEnv,
                }
              );

              for (const update of updates) {
                processController
                  .do(replaceFiles(update.replacements))
                  .do(ensureDeploymentTimeLessThan(update.deployThresholdSec));
              }

              // Execute the process.
              await processController
                .do(interruptSandbox())
                .do(rejectCleanupSandbox())
                .run();

              await testProject.assertPostDeployment(sandboxBackendIdentifier);
            }
          });
        });
      });
    });
  });
});

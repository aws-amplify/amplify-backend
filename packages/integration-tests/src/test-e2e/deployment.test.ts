import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../setup_test_directory.js';
import fs from 'fs/promises';
import { shortUuid } from '../short_uuid.js';
import { getTestProjectCreators } from '../test-project-setup/test_project_creator.js';
import { TestProjectBase } from '../test-project-setup/test_project_base.js';
import { userInfo } from 'os';
import { PredicatedActionBuilder } from '../process-controller/predicated_action_queue_builder.js';
import { amplifyCli } from '../process-controller/process_controller.js';
import path from 'path';
import {
  ensureDeploymentTimeLessThan,
  interruptSandbox,
  rejectCleanupSandbox,
  replaceFiles,
} from '../process-controller/predicated_action_macros.js';
import assert from 'node:assert';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import { testConcurrencyLevel } from './test_concurrency.js';
import { TestCdkProjectBase } from '../test-project-setup/cdk/test_cdk_project_base.js';
import { getTestCdkProjectCreators } from '../test-project-setup/cdk/test_cdk_project_creator.js';
import {
  amplifySharedSecretNameKey,
  createAmplifySharedSecretName,
} from '../shared_secret.js';

const testProjectCreators = getTestProjectCreators();
const testCdkProjectCreators = getTestCdkProjectCreators();
void describe('deployment tests', { concurrency: testConcurrencyLevel }, () => {
  before(async () => {
    await createTestDirectory(rootTestDir);
  });
  after(async () => {
    await deleteTestDirectory(rootTestDir);
  });

  void describe('amplify deploys', async () => {
    testProjectCreators.forEach((testProjectCreator) => {
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

        void it(`[${testProjectCreator.name}] deploys fully`, async () => {
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

          // test generating all client formats
          for (const format of Object.values(ClientConfigFormat)) {
            await amplifyCli(
              [
                'generate',
                'config',
                '--branch',
                testBranch.branchName,
                '--app-id',
                testBranch.appId,
                '--format',
                format,
              ],
              testProject.projectDirPath
            ).run();

            await testProject.assertClientConfigExists(
              testProject.projectDirPath,
              format
            );
          }
        });
      });
    });

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

          void it(`[${testProjectCreator.name}] hot-swaps a change`, async () => {
            const processController = amplifyCli(
              ['sandbox', '--dirToWatch', 'amplify'],
              testProject.projectDirPath,
              {
                env: sharedSecretsEnv,
              }
            );

            const updates = await testProject.getUpdates();
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
          });
        });
      });
    });

    void describe('fails on compilation error', async () => {
      let testProject: TestProjectBase;
      before(async () => {
        // any project is fine
        testProject = await testProjectCreators[0].createProject(rootTestDir);
        await fs.cp(
          testProject.sourceProjectAmplifyDirPath,
          testProject.projectAmplifyDirPath,
          {
            recursive: true,
          }
        );

        // inject failure
        await fs.appendFile(
          path.join(testProject.projectAmplifyDirPath, 'backend.ts'),
          "this won't compile"
        );
      });

      void describe('in sequence', { concurrency: false }, () => {
        void it('in sandbox deploy', async () => {
          await amplifyCli(
            ['sandbox', '--dirToWatch', 'amplify'],
            testProject.projectDirPath
          )
            .do(
              new PredicatedActionBuilder().waitForLineIncludes(
                'TypeScript validation check failed'
              )
            )
            .do(interruptSandbox())
            .do(rejectCleanupSandbox())
            .run();
        });

        void it('in pipeline deploy', async () => {
          await assert.rejects(() =>
            amplifyCli(
              [
                'pipeline-deploy',
                '--branch',
                'test-branch',
                '--app-id',
                `test-${shortUuid()}`,
              ],
              testProject.projectDirPath,
              {
                env: { CI: 'true' },
              }
            )
              .do(
                new PredicatedActionBuilder().waitForLineIncludes(
                  'TypeScript validation check failed'
                )
              )
              .run()
          );
        });
      });
    });
  });

  void describe('cdk deploys', () => {
    testCdkProjectCreators.forEach((testCdkProjectCreator) => {
      void describe(`${testCdkProjectCreator.name}`, () => {
        let testCdkProject: TestCdkProjectBase;

        beforeEach(async () => {
          testCdkProject = await testCdkProjectCreator.createProject(
            rootTestDir
          );
        });

        afterEach(async () => {
          await testCdkProject.tearDown();
        });

        void it(`deploys`, async () => {
          await testCdkProject.deploy();
          await testCdkProject.assertPostDeployment();
        });
      });
    });
  });
});

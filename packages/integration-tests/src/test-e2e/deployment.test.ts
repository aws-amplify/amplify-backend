import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../setup_test_directory.js';
import fs from 'fs/promises';
import { shortUuid } from '../short_uuid.js';
import { getTestProjectCreators } from './test_project.js';
import { userInfo } from 'os';
import { PredicatedActionBuilder } from '../process-controller/predicated_action_queue_builder.js';
import { amplifyCli } from '../process-controller/process_controller.js';
import path from 'path';
import {
  ensureDeploymentTimeLessThan,
  interruptSandbox,
  rejectCleanupSandbox,
  updateFileContent,
} from '../process-controller/predicated_action_macros.js';
import assert from 'node:assert';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { testConcurrencyLevel } from './test_concurrency.js';
import { TestProjectBase } from './test_project_base.js';

const testProjectCreators = getTestProjectCreators();
void describe(
  'amplify deploys',
  { concurrency: testConcurrencyLevel },
  async () => {
    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

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
          await testProject.assertPostDeployment();
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
          void it(`[${testProjectCreator.name}] deploys fully`, async () => {
            await testProject.deploy(sandboxBackendIdentifier);
            await testProject.assertPostDeployment();
          });

          void it(`[${testProjectCreator.name}] hot-swaps a change`, async () => {
            const processController = amplifyCli(
              ['sandbox', '--dirToWatch', 'amplify'],
              testProject.projectDirPath
            );

            const updates = await testProject.getUpdates();
            for (const update of updates) {
              processController
                .do(updateFileContent(update.sourceFile, update.projectFile))
                .do(ensureDeploymentTimeLessThan(update.deployThresholdSec));
            }

            // Execute the process.
            await processController
              .do(interruptSandbox())
              .do(rejectCleanupSandbox())
              .run();

            await testProject.assertPostDeployment();
          });
        });
      });
    });

    void describe('fails on compilation error', async () => {
      let testProject: TestProjectBase;
      beforeEach(async () => {
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

      void it('in sandbox deploy', async () => {
        await amplifyCli(
          ['sandbox', '--dirToWatch', 'amplify'],
          testProject.projectDirPath
        )
          .do(new PredicatedActionBuilder().waitForLineIncludes('error TS'))
          .do(
            new PredicatedActionBuilder().waitForLineIncludes(
              'Unexpected keyword or identifier'
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
            .do(new PredicatedActionBuilder().waitForLineIncludes('error TS'))
            .do(
              new PredicatedActionBuilder().waitForLineIncludes(
                'Unexpected keyword or identifier'
              )
            )
            .run()
        );
      });
    });
  }
);

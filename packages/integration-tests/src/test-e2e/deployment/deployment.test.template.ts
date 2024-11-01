import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import fs from 'fs/promises';
import { shortUuid } from '../../short_uuid.js';
import { TestProjectCreator } from '../../test-project-setup/test_project_creator.js';
import { TestProjectBase } from '../../test-project-setup/test_project_base.js';
import { PredicatedActionBuilder } from '../../process-controller/predicated_action_queue_builder.js';
import { ampxCli } from '../../process-controller/process_controller.js';
import path from 'path';
import { waitForSandboxToBecomeIdle } from '../../process-controller/predicated_action_macros.js';
import assert from 'node:assert';
import { TestBranch, amplifyAppPool } from '../../amplify_app_pool.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import { testConcurrencyLevel } from '../test_concurrency.js';

/**
 * Defines deployment test
 */
export const defineDeploymentTest = (
  testProjectCreator: TestProjectCreator
) => {
  void describe(
    'deployment tests',
    { concurrency: testConcurrencyLevel },
    () => {
      before(async () => {
        await createTestDirectory(rootTestDir);
      });
      after(async () => {
        await deleteTestDirectory(rootTestDir);
      });

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
          for (const format of [
            ClientConfigFormat.DART,
            ClientConfigFormat.JSON,
          ]) {
            await ampxCli(
              [
                'generate',
                'outputs',
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

      void describe('fails on compilation error', async () => {
        let testProject: TestProjectBase;
        before(async () => {
          // any project is fine
          testProject = await testProjectCreator.createProject(rootTestDir);
          await fs.cp(
            testProject.sourceProjectAmplifyDirURL,
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
            const predicatedActionBuilder = new PredicatedActionBuilder();
            await ampxCli(
              ['sandbox', '--dirToWatch', 'amplify'],
              testProject.projectDirPath
            )
              .do(
                predicatedActionBuilder.waitForLineIncludes(
                  'TypeScript validation check failed'
                )
              )
              .do(waitForSandboxToBecomeIdle())
              .do(predicatedActionBuilder.sendCtrlC())
              .run();
          });

          void it('in pipeline deploy', async () => {
            await assert.rejects(() =>
              ampxCli(
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
    }
  );
};

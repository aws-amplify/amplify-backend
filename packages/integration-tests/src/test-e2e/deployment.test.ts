import { after, afterEach, beforeEach, describe, it } from 'node:test';
import { deleteTestDirectory, rootTestDir } from '../setup_test_directory.js';
import fs from 'fs/promises';
import { shortUuid } from '../short_uuid.js';
import { generateTestProjects } from './test_project.js';
import {
  BranchBackendIdentifier,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
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
import { TestBranch, amplifyAppPool } from './amplify_app_pool.js';

const testProjects = await generateTestProjects(rootTestDir);

void describe('amplify deploys', async () => {
  after(async () => {
    await deleteTestDirectory(rootTestDir);
  });

  testProjects.forEach((testProject) => {
    void describe(`branch deploys ${testProject.name}`, () => {
      let branchBackendIdentifier: BranchBackendIdentifier;
      let testBranch: TestBranch;

      beforeEach(async () => {
        testBranch = await amplifyAppPool.createTestBranch();
        branchBackendIdentifier = new BranchBackendIdentifier(
          testBranch.appId,
          testBranch.branchName
        );
      });

      afterEach(async () => {
        await testProject.tearDown(branchBackendIdentifier);
      });

      void it(`[${testProject.name}] deploys fully`, async () => {
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
            branchBackendIdentifier.backendId
          )
        );
        assert.ok(
          testBranchDetails.backend?.stackArn?.includes(
            branchBackendIdentifier.disambiguator
          )
        );
      });
    });
  });

  testProjects.forEach((testProject) => {
    void describe(`sandbox deploys ${testProject.name}`, () => {
      const sandboxBackendIdentifier = new SandboxBackendIdentifier(
        `${testProject.name}-${userInfo().username}`
      );

      after(async () => {
        await testProject.tearDown(sandboxBackendIdentifier);
      });

      void it(`[${sandboxBackendIdentifier.backendId}] deploys fully`, async () => {
        await testProject.deploy(sandboxBackendIdentifier);
        await testProject.assertPostDeployment();
      });

      void it(`[${sandboxBackendIdentifier.backendId}] hot-swaps a change`, async () => {
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

  void describe('fails on compilation error', () => {
    // any project is fine
    const testProject = testProjects[0];
    beforeEach(async () => {
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
});

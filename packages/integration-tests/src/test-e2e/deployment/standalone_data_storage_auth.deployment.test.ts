import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { DataStorageAuthWithTriggerTestProjectCreator } from '../../test-project-setup/data_storage_auth_with_triggers.js';
import { TestProjectBase } from '../../test-project-setup/test_project_base.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { testConcurrencyLevel } from '../test_concurrency.js';
import { shortUuid } from '../../short_uuid.js';
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import fsp from 'fs/promises';

const testProjectCreator = new DataStorageAuthWithTriggerTestProjectCreator();

void describe(
  'standalone data-storage-auth deployment tests',
  { concurrency: testConcurrencyLevel },
  () => {
    const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    let standaloneBackendIdentifier: BackendIdentifier;
    let testProject: TestProjectBase;

    beforeEach(async () => {
      testProject = await testProjectCreator.createProject(rootTestDir);
      standaloneBackendIdentifier = {
        namespace: `standalone-e2e-${shortUuid()}`,
        name: 'default',
        type: 'standalone',
      };
    });

    afterEach(async () => {
      await testProject.tearDown(standaloneBackendIdentifier, true);
    });

    void it('deploys and verifies full stack via standalone', async () => {
      await testProject.deploy(standaloneBackendIdentifier);
      await testProject.assertPostDeployment(standaloneBackendIdentifier);
    });

    void it('redeploys with modifications and verifies update succeeds', async () => {
      // 1. Initial deploy
      await testProject.deploy(standaloneBackendIdentifier);

      // 2. Verify initial deployment
      await testProject.assertPostDeployment(standaloneBackendIdentifier);

      const stackName = BackendIdentifierConversions.toStackName(
        standaloneBackendIdentifier,
      );

      // 3. Apply project updates (modified data schema, updated Lambda handler)
      const updates = await testProject.getUpdates();
      for (const update of updates) {
        for (const replacement of update.replacements) {
          await fsp.cp(replacement.source, replacement.destination, {
            force: true,
          });
        }
      }

      // 4. Redeploy with the same identifier
      await testProject.deploy(standaloneBackendIdentifier);

      // 5. Verify update succeeded and resources are correct
      const updateResult = await cfnClient.send(
        new DescribeStacksCommand({ StackName: stackName }),
      );
      assert.ok(
        updateResult.Stacks?.[0]?.StackStatus === 'UPDATE_COMPLETE',
        `redeploy should result in UPDATE_COMPLETE, got: ${updateResult.Stacks?.[0]?.StackStatus}`,
      );

      await testProject.assertPostDeployment(standaloneBackendIdentifier);
    });
  },
);

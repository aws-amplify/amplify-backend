import { after, before, describe, it } from 'node:test';
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
import {
  amplifySharedSecretNameKey,
  createAmplifySharedSecretName,
} from '../../shared_secret.js';

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

    void describe('standalone deploys data-storage-auth', () => {
      let testProject: TestProjectBase;
      let standaloneBackendIdentifier: BackendIdentifier;

      const sharedSecretsEnv = {
        [amplifySharedSecretNameKey]: createAmplifySharedSecretName(),
      };

      before(async () => {
        testProject = await testProjectCreator.createProject(rootTestDir);
        standaloneBackendIdentifier = {
          namespace: `standalone-e2e-${shortUuid()}`,
          name: 'stack',
          type: 'standalone',
        };
      });

      after(async () => {
        await testProject.tearDown(standaloneBackendIdentifier, true);
      });

      void describe('in sequence', { concurrency: false }, () => {
        void it('deploys and verifies full stack via standalone', async () => {
          await testProject.deploy(
            standaloneBackendIdentifier,
            sharedSecretsEnv,
          );
          await testProject.assertPostDeployment(standaloneBackendIdentifier);
        });

        void it('redeploys with modifications and verifies update succeeds', async () => {
          const stackName = BackendIdentifierConversions.toStackName(
            standaloneBackendIdentifier,
          );

          // Apply project updates (modified data schema, updated Lambda handler)
          const updates = await testProject.getUpdates();
          for (const update of updates) {
            for (const replacement of update.replacements) {
              await fsp.cp(replacement.source, replacement.destination, {
                force: true,
              });
            }
          }

          // Redeploy with the same identifier and shared secret
          await testProject.deploy(
            standaloneBackendIdentifier,
            sharedSecretsEnv,
          );

          // Verify update succeeded and resources are correct
          const updateResult = await cfnClient.send(
            new DescribeStacksCommand({ StackName: stackName }),
          );
          assert.ok(
            updateResult.Stacks?.[0]?.StackStatus === 'UPDATE_COMPLETE',
            `redeploy should result in UPDATE_COMPLETE, got: ${updateResult.Stacks?.[0]?.StackStatus}`,
          );

          await testProject.assertPostDeployment(standaloneBackendIdentifier);
        });
      });
    });
  },
);

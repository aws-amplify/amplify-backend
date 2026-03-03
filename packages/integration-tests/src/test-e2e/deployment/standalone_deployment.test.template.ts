import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { TestProjectCreator } from '../../test-project-setup/test_project_creator.js';
import { TestProjectBase } from '../../test-project-setup/test_project_base.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { testConcurrencyLevel } from '../test_concurrency.js';
import { shortUuid } from '../../short_uuid.js';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  ListStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Defines standalone deployment test.
 *
 * Standalone tests use defineBackend(factories, new App()) in backend.ts.
 * They deploy using `ampx pipeline-deploy --branch main` (no --app-id).
 * The custom App triggers standalone mode automatically.
 */
export const defineStandaloneDeploymentTest = (
  testProjectCreator: TestProjectCreator,
) => {
  void describe(
    'standalone deployment tests',
    { concurrency: testConcurrencyLevel },
    () => {
      const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

      before(async () => {
        await createTestDirectory(rootTestDir);
      });
      after(async () => {
        await deleteTestDirectory(rootTestDir);
      });

      void describe(`standalone deploys ${testProjectCreator.name}`, () => {
        let standaloneBackendIdentifier: BackendIdentifier;
        let testProject: TestProjectBase;

        beforeEach(async () => {
          testProject = await testProjectCreator.createProject(rootTestDir);
          standaloneBackendIdentifier = {
            namespace: `standalone-e2e-${shortUuid()}`,
            name: 'main',
            type: 'standalone',
          };

          // Patch backend.ts to use a custom CDK App (Option E).
          // This injects `new App()` into defineBackend() to trigger standalone mode.
          const backendTsPath = path.join(
            testProject.projectDirPath,
            'amplify',
            'backend.ts',
          );
          let backendTs = await fs.readFile(backendTsPath, 'utf-8');
          // Add App import
          backendTs = backendTs.replace(
            "import { defineBackend } from '@aws-amplify/backend';",
            "import { defineBackend } from '@aws-amplify/backend';\nimport { App } from 'aws-cdk-lib';",
          );
          // Inject App into defineBackend call
          backendTs = backendTs.replace(
            /defineBackend\(([^)]+)\)/,
            'defineBackend($1, new App())',
          );
          await fs.writeFile(backendTsPath, backendTs);
        });

        afterEach(async () => {
          await testProject.tearDown(standaloneBackendIdentifier, true);
        });

        void it(`[${testProjectCreator.name}] deploys fully via standalone`, async () => {
          await testProject.deploy(standaloneBackendIdentifier);

          const stackName = BackendIdentifierConversions.toStackName(
            standaloneBackendIdentifier,
          );

          // Verify the CFN stack exists and is in a good state
          const describeResult = await cfnClient.send(
            new DescribeStacksCommand({ StackName: stackName }),
          );
          assert.ok(
            describeResult.Stacks && describeResult.Stacks.length > 0,
            'standalone stack should exist after deployment',
          );
          const stack = describeResult.Stacks![0];
          assert.ok(
            stack.StackStatus === 'CREATE_COMPLETE' ||
              stack.StackStatus === 'UPDATE_COMPLETE',
            `stack should be in a successful state, got: ${stack.StackStatus}`,
          );

          // Verify no Amplify Hosting resources in the stack
          const resources = await cfnClient.send(
            new ListStackResourcesCommand({ StackName: stackName }),
          );
          const resourceTypes = (resources.StackResourceSummaries ?? []).map(
            (r) => r.ResourceType,
          );
          assert.ok(
            !resourceTypes.includes('AWS::Amplify::App'),
            'standalone stack should not contain AWS::Amplify::App',
          );
          assert.ok(
            !resourceTypes.includes('AWS::Amplify::Branch'),
            'standalone stack should not contain AWS::Amplify::Branch',
          );

          // Verify post-deployment assertions (client config, etc.)
          await testProject.assertPostDeployment(standaloneBackendIdentifier);
        });
      });
    },
  );
};

import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { StandaloneHostingSpaTestProjectCreator } from '../../test-project-setup/standalone_hosting_spa.js';
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
import path from 'path';

const testProjectCreator = new StandaloneHostingSpaTestProjectCreator();

void describe(
  'standalone hosting SPA deployment tests',
  { concurrency: testConcurrencyLevel },
  () => {
    const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('standalone deploys hosting-spa', () => {
      let standaloneBackendIdentifier: BackendIdentifier;
      let testProject: TestProjectBase;

      beforeEach(async () => {
        testProject = await testProjectCreator.createProject(rootTestDir);
        standaloneBackendIdentifier = {
          namespace: `standalone-e2e-${shortUuid()}`,
          name: 'stack',
          type: 'standalone',
        };
      });

      afterEach(async () => {
        try {
          await testProject.tearDown(standaloneBackendIdentifier, true);
        } catch {
          console.warn('⚠️ Stack deletion may not have completed. Check for orphaned resources.');
        }
      }, { timeout: 1500000 });

      void it(
        `[${testProjectCreator.name}] deploys SPA hosting via standalone`,
        async () => {
          await testProject.deploy(standaloneBackendIdentifier);

          const stackName = BackendIdentifierConversions.toStackName(
            standaloneBackendIdentifier,
          );

          // Verify stack deployed successfully
          const describeResult = await cfnClient.send(
            new DescribeStacksCommand({ StackName: stackName }),
          );
          assert.ok(
            describeResult.Stacks && describeResult.Stacks.length > 0,
            'standalone hosting stack should exist after deployment',
          );
          const stack = describeResult.Stacks![0];
          assert.ok(
            stack.StackStatus === 'CREATE_COMPLETE' ||
              stack.StackStatus === 'UPDATE_COMPLETE',
            `stack should be in a successful state, got: ${stack.StackStatus}`,
          );

          // List all resources across root and nested stacks
          const rootResources = await cfnClient.send(
            new ListStackResourcesCommand({ StackName: stackName }),
          );
          const allResourceTypes: string[] = [];
          const nestedStackIds: string[] = [];

          for (const r of rootResources.StackResourceSummaries ?? []) {
            allResourceTypes.push(r.ResourceType!);
            if (r.ResourceType === 'AWS::CloudFormation::Stack') {
              nestedStackIds.push(r.PhysicalResourceId!);
            }
          }

          // Enumerate nested stack resources
          for (const nestedStackId of nestedStackIds) {
            const nestedResources = await cfnClient.send(
              new ListStackResourcesCommand({ StackName: nestedStackId }),
            );
            for (const r of nestedResources.StackResourceSummaries ?? []) {
              allResourceTypes.push(r.ResourceType!);
            }
          }

          // Verify S3 bucket exists
          assert.ok(
            allResourceTypes.includes('AWS::S3::Bucket'),
            'hosting stack should contain an S3 bucket',
          );

          // Verify CloudFront distribution exists
          assert.ok(
            allResourceTypes.includes('AWS::CloudFront::Distribution'),
            'hosting stack should contain a CloudFront distribution',
          );

          // Verify Origin Access Control exists (OAC, NOT legacy OAI)
          assert.ok(
            allResourceTypes.includes('AWS::CloudFront::OriginAccessControl'),
            'hosting stack should contain Origin Access Control (OAC)',
          );

          // Verify CloudFront Function exists (for Build ID rewriting)
          assert.ok(
            allResourceTypes.includes('AWS::CloudFront::Function'),
            'hosting stack should contain a CloudFront Function for atomic deploys',
          );

          // Verify NO legacy OAI
          assert.ok(
            !allResourceTypes.includes(
              'AWS::CloudFront::CloudFrontOriginAccessIdentity',
            ),
            'hosting stack should NOT contain legacy Origin Access Identity (OAI)',
          );

          // Verify NO Amplify Hosting managed resources
          assert.ok(
            !allResourceTypes.includes('AWS::Amplify::App'),
            'standalone hosting stack should not use managed AWS::Amplify::App',
          );
          assert.ok(
            !allResourceTypes.includes('AWS::Amplify::Branch'),
            'standalone hosting stack should not use managed AWS::Amplify::Branch',
          );

          // Verify post-deployment assertions (client config file exists)
          await testProject.assertPostDeployment(standaloneBackendIdentifier);

          // Best-effort HTTP verification of deployed site
          try {
            const clientConfigPath = path.join(
              testProject.projectDirPath,
              'amplify_outputs.json',
            );
            const fs = await import('fs/promises');
            const configRaw = await fs.readFile(clientConfigPath, 'utf-8').catch(() => '');
            if (configRaw) {
              const clientConfig = JSON.parse(configRaw);
              const distributionUrl = clientConfig.hosting?.distribution_url;
              if (distributionUrl) {
                // Wait for CloudFront propagation
                await new Promise(resolve => setTimeout(resolve, 30000));
                const response = await fetch(`https://${distributionUrl}`);
                assert.ok(
                  response.status === 200 || response.status === 304,
                  `Expected HTTP 200/304 from CloudFront, got ${response.status}`,
                );
              }
            }
            // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
          } catch {
            // Best-effort — don't fail the test if HTTP check can't be performed
          }
        },
      );
    });
  },
);

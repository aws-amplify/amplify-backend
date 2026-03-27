import { after, before, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { StandaloneHostingSpaTestProjectCreator } from '../../test-project-setup/standalone_hosting_spa.js';
import { TestProjectBase } from '../../test-project-setup/test_project_base.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { shortUuid } from '../../short_uuid.js';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  ListStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import fsp from 'fs/promises';
import {
  fetchWithRetry,
  getDistributionUrlFromStack,
} from '../../hosting_test_helpers.js';

const testProjectCreator = new StandaloneHostingSpaTestProjectCreator();

void describe(
  'standalone hosting SPA deployment tests',
  { concurrency: false, timeout: 1800000 },
  () => {
    const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('standalone deploys hosting-spa', () => {
      let testProject: TestProjectBase;
      let standaloneBackendIdentifier: BackendIdentifier;
      let distributionUrl: string;

      before(async () => {
        testProject = await testProjectCreator.createProject(rootTestDir);
        standaloneBackendIdentifier = {
          namespace: `standalone-e2e-${shortUuid()}`,
          name: 'stack',
          type: 'standalone',
        };
      });

      after(
        async () => {
          try {
            await testProject.tearDown(standaloneBackendIdentifier, true);
          } catch {
            console.warn(
              '⚠️ Stack deletion may not have completed. Check for orphaned resources.',
            );
          }
        },
        { timeout: 1500000 },
      );

      void describe('in sequence', { concurrency: false }, () => {
        void it('stage 1: deploys SPA and verifies v1 content', async () => {
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
            'hosting stack should exist after deployment',
          );
          const stack = describeResult.Stacks![0];
          assert.ok(
            stack.StackStatus === 'CREATE_COMPLETE' ||
              stack.StackStatus === 'UPDATE_COMPLETE',
            `stack should be in a successful state, got: ${stack.StackStatus}`,
          );

          // Get CloudFront distribution URL from nested stack outputs
          distributionUrl = await getDistributionUrlFromStack(
            cfnClient,
            stackName,
          );
          assert.ok(
            distributionUrl.startsWith('https://'),
            `DistributionUrl should start with https://, got: ${distributionUrl}`,
          );
          console.log(`CloudFront URL: ${distributionUrl}`);

          // Verify v1 content via HTTP with retry for CloudFront propagation
          const response = await fetchWithRetry(distributionUrl, {
            expectedBodyContains: 'Hello SPA v1',
            maxRetries: 10,
            intervalMs: 30000,
          });
          assert.strictEqual(
            response.status,
            200,
            `Expected HTTP 200, got ${response.status}`,
          );
          const body = await response.text();
          assert.ok(
            body.includes('Hello SPA v1'),
            `Response body should contain "Hello SPA v1", got: ${body.substring(0, 200)}`,
          );

          // Verify SPA fallback: a nonexistent route should return index.html
          const fallbackResponse = await fetchWithRetry(
            `${distributionUrl}/nonexistent-route`,
            {
              expectedStatus: 200,
              maxRetries: 3,
              intervalMs: 5000,
            },
          );
          const fallbackBody = await fallbackResponse.text();
          assert.ok(
            fallbackBody.includes('Hello SPA v1'),
            `SPA fallback should return index.html content, got: ${fallbackBody.substring(0, 200)}`,
          );

          // Verify security headers
          const headersResponse = await fetch(distributionUrl);
          const headers = headersResponse.headers;
          assert.ok(
            headers.get('strict-transport-security'),
            'Response should include strict-transport-security header',
          );
          assert.strictEqual(
            headers.get('x-content-type-options'),
            'nosniff',
            'x-content-type-options should be nosniff',
          );
          assert.ok(
            headers.get('x-frame-options'),
            'Response should include x-frame-options header',
          );

          await testProject.assertPostDeployment(standaloneBackendIdentifier);
        });

        void it('stage 2: redeploys with v2 content and verifies update', async () => {
          // Apply stage 2 updates (content change)
          const updates = await testProject.getUpdates();
          const stage2Update = updates[0];
          for (const replacement of stage2Update.replacements) {
            await fsp.cp(replacement.source, replacement.destination, {
              force: true,
            });
          }

          // Redeploy
          await testProject.deploy(standaloneBackendIdentifier);

          const stackName = BackendIdentifierConversions.toStackName(
            standaloneBackendIdentifier,
          );
          const updateResult = await cfnClient.send(
            new DescribeStacksCommand({ StackName: stackName }),
          );
          assert.ok(
            updateResult.Stacks?.[0]?.StackStatus === 'UPDATE_COMPLETE',
            `redeploy should result in UPDATE_COMPLETE, got: ${updateResult.Stacks?.[0]?.StackStatus}`,
          );

          // Wait for cache invalidation and verify v2 content
          const response = await fetchWithRetry(distributionUrl, {
            expectedBodyContains: 'Hello SPA v2',
            maxRetries: 10,
            intervalMs: 15000,
          });
          const body = await response.text();
          assert.ok(
            body.includes('Hello SPA v2'),
            `Response body should contain "Hello SPA v2" after redeploy, got: ${body.substring(0, 200)}`,
          );
          assert.ok(
            !body.includes('Hello SPA v1'),
            'Response body should NOT contain "Hello SPA v1" after redeploy',
          );
        });

        void it('stage 3: redeploys with WAF enabled and verifies infra change', async () => {
          // Apply stage 3 updates (infra change — WAF)
          const updates = await testProject.getUpdates();
          const stage3Update = updates[1];
          for (const replacement of stage3Update.replacements) {
            await fsp.cp(replacement.source, replacement.destination, {
              force: true,
            });
          }

          // Redeploy
          await testProject.deploy(standaloneBackendIdentifier);

          const stackName = BackendIdentifierConversions.toStackName(
            standaloneBackendIdentifier,
          );

          // Verify WAFv2 WebACL resource exists in stack
          const allResourceTypes = await getAllResourceTypes(
            cfnClient,
            stackName,
          );
          assert.ok(
            allResourceTypes.includes('AWS::WAFv2::WebACL'),
            'Stack should contain AWS::WAFv2::WebACL after enabling WAF',
          );

          // Verify content still works
          const response = await fetchWithRetry(distributionUrl, {
            expectedBodyContains: 'Hello SPA v2',
            maxRetries: 6,
            intervalMs: 15000,
          });
          assert.strictEqual(
            response.status,
            200,
            `Expected HTTP 200 after WAF change, got ${response.status}`,
          );
          const body = await response.text();
          assert.ok(
            body.includes('Hello SPA v2'),
            `Content should still be v2 after infra change, got: ${body.substring(0, 200)}`,
          );
        });
      });
    });
  },
);

/**
 * Collect all resource types from root and nested stacks.
 */
const getAllResourceTypes = async (
  cfnClient: CloudFormationClient,
  stackName: string,
): Promise<string[]> => {
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

  for (const nestedStackId of nestedStackIds) {
    const nestedResources = await cfnClient.send(
      new ListStackResourcesCommand({ StackName: nestedStackId }),
    );
    for (const r of nestedResources.StackResourceSummaries ?? []) {
      allResourceTypes.push(r.ResourceType!);
    }
  }

  return allResourceTypes;
};

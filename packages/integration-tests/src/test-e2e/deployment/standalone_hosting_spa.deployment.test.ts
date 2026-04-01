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
import path from 'path';
import {
  fetchWithRetry,
  getDistributionUrlFromStack,
} from '../../hosting_test_support.js';

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
      const namespace = `standalone-e2e-${shortUuid()}`;
      let backendIdentifier: BackendIdentifier;
      let frontendIdentifier: BackendIdentifier;
      let distributionUrl: string;

      before(async () => {
        testProject = await testProjectCreator.createProject(rootTestDir);
        backendIdentifier = {
          namespace,
          name: 'backend',
          type: 'standalone',
        };
        frontendIdentifier = {
          namespace,
          name: 'hosting',
          type: 'standalone',
        };
      });

      after(
        async () => {
          try {
            await testProject.tearDown(frontendIdentifier, true);
          } catch {
            process.stderr.write(
              '⚠️ Frontend stack deletion may not have completed. Check for orphaned resources.\n',
            );
          }
          try {
            await testProject.tearDown(backendIdentifier, true);
          } catch {
            process.stderr.write(
              '⚠️ Backend stack deletion may not have completed. Check for orphaned resources.\n',
            );
          }
        },
        { timeout: 1500000 },
      );

      void describe('in sequence', { concurrency: false }, () => {
        void it('stage 1: deploys backend and verifies outputs', async () => {
          await testProject.deploy(backendIdentifier);

          const backendStackName =
            BackendIdentifierConversions.toStackName(backendIdentifier);

          // Verify backend stack deployed successfully
          const describeResult = await cfnClient.send(
            new DescribeStacksCommand({ StackName: backendStackName }),
          );
          assert.ok(
            describeResult.Stacks && describeResult.Stacks.length > 0,
            'backend stack should exist after deployment',
          );
          const stack = describeResult.Stacks![0];
          assert.ok(
            stack.StackStatus === 'CREATE_COMPLETE' ||
              stack.StackStatus === 'UPDATE_COMPLETE',
            `backend stack should be in a successful state, got: ${stack.StackStatus}`,
          );

          // Verify amplify_outputs.json is readable after backend deploy
          const outputsPath = path.join(
            testProject.projectDirPath,
            'amplify_outputs.json',
          );
          await fsp.readFile(outputsPath, 'utf-8');
        });

        void it('stage 2: deploys frontend and verifies CloudFront URL', async () => {
          await testProject.deploy(frontendIdentifier);

          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);

          // Verify frontend stack deployed successfully
          const describeResult = await cfnClient.send(
            new DescribeStacksCommand({ StackName: frontendStackName }),
          );
          assert.ok(
            describeResult.Stacks && describeResult.Stacks.length > 0,
            'frontend stack should exist after deployment',
          );
          const stack = describeResult.Stacks![0];
          assert.ok(
            stack.StackStatus === 'CREATE_COMPLETE' ||
              stack.StackStatus === 'UPDATE_COMPLETE',
            `frontend stack should be in a successful state, got: ${stack.StackStatus}`,
          );

          // Get CloudFront distribution URL from frontend stack
          distributionUrl = await getDistributionUrlFromStack(
            cfnClient,
            frontendStackName,
          );
          assert.ok(
            distributionUrl.startsWith('https://'),
            `DistributionUrl should start with https://, got: ${distributionUrl}`,
          );
          process.stderr.write(`CloudFront URL: ${distributionUrl}\n`);

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
          const csp = headers.get('content-security-policy');
          assert.ok(
            csp,
            'Response should include content-security-policy header',
          );
          assert.ok(
            csp!.includes('wss:'),
            `content-security-policy connect-src should include wss:, got: ${csp}`,
          );

          await testProject.assertPostDeployment(backendIdentifier);
        });

        void it('stage 3: redeploys frontend with v2 content and verifies update', async () => {
          // Apply stage 2 updates (content change)
          const updates = await testProject.getUpdates();
          const stage2Update = updates[0];
          for (const replacement of stage2Update.replacements) {
            await fsp.cp(replacement.source, replacement.destination, {
              force: true,
            });
          }

          // Redeploy frontend only
          await testProject.deploy(frontendIdentifier);

          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);
          const updateResult = await cfnClient.send(
            new DescribeStacksCommand({ StackName: frontendStackName }),
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

        void it('stage 4: redeploys frontend with access logging enabled and verifies infra change', async () => {
          // Apply stage 3 updates (infra change — access logging)
          const updates = await testProject.getUpdates();
          const stage3Update = updates[1];
          for (const replacement of stage3Update.replacements) {
            await fsp.cp(replacement.source, replacement.destination, {
              force: true,
            });
          }

          // Redeploy frontend only
          await testProject.deploy(frontendIdentifier);

          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);

          // Verify the stack updated successfully
          const updateResult = await cfnClient.send(
            new DescribeStacksCommand({ StackName: frontendStackName }),
          );
          assert.ok(
            updateResult.Stacks?.[0]?.StackStatus === 'UPDATE_COMPLETE',
            `infra redeploy should result in UPDATE_COMPLETE, got: ${updateResult.Stacks?.[0]?.StackStatus}`,
          );

          // Verify an additional S3 bucket was created for access logs
          const allResourceTypes = await getAllResourceTypes(
            cfnClient,
            frontendStackName,
          );
          const s3BucketCount = allResourceTypes.filter(
            (t) => t === 'AWS::S3::Bucket',
          ).length;
          assert.ok(
            s3BucketCount >= 2,
            `Frontend stack should have at least 2 S3 buckets (hosting + access log) after enabling access logging, got: ${s3BucketCount}`,
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
            `Expected HTTP 200 after access logging change, got ${response.status}`,
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

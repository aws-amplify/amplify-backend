import { after, before, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { StandaloneHostingSsrTestProjectCreator } from '../../test-project-setup/standalone_hosting_ssr.js';
import { TestProjectBase } from '../../test-project-setup/test_project_base.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { shortUuid } from '../../short_uuid.js';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  ListStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import fsp from 'fs/promises';
import {
  fetchWithRetry,
  getDistributionUrlFromStack,
} from '../../hosting_test_helpers.js';

const testProjectCreator = new StandaloneHostingSsrTestProjectCreator();

void describe(
  'standalone hosting SSR deployment tests',
  { concurrency: false, timeout: 1800000 },
  () => {
    const cfnClient = new CloudFormationClient(e2eToolingClientConfig);
    const lambdaClient = new LambdaClient(e2eToolingClientConfig);

    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('standalone deploys hosting-ssr', () => {
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
        void it('stage 1: deploys SSR and verifies server-rendered content', async () => {
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
            'hosting SSR stack should exist after deployment',
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

          // Verify SSR content via HTTP with retry for CloudFront/Lambda propagation
          const response = await fetchWithRetry(distributionUrl, {
            expectedBodyContains: 'Hello SSR v1',
            maxRetries: 10,
            intervalMs: 30000,
          });
          assert.strictEqual(
            response.status,
            200,
            `Expected HTTP 200 from SSR, got ${response.status}`,
          );
          const body = await response.text();
          assert.ok(
            body.includes('Hello SSR v1'),
            `Response body should contain "Hello SSR v1" (proves Lambda runs), got: ${body.substring(0, 200)}`,
          );

          // Verify static asset (SVG) is accessible via /_next/static/ path
          const svgResponse = await fetchWithRetry(
            `${distributionUrl}/_next/static/logo.svg`,
            {
              expectedStatus: 200,
              maxRetries: 3,
              intervalMs: 5000,
            },
          );
          assert.strictEqual(
            svgResponse.status,
            200,
            `Expected HTTP 200 for SVG static asset, got ${svgResponse.status}`,
          );
          const svgContentType = svgResponse.headers.get('content-type') ?? '';
          assert.ok(
            svgContentType.includes('svg') ||
              svgContentType.includes('xml') ||
              svgContentType.includes('octet-stream'),
            `SVG content-type should be svg/xml-related, got: ${svgContentType}`,
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

        void it('stage 2: redeploys with v2 SSR content and verifies update', async () => {
          // Apply stage 2 updates (server.js content change)
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

          // Wait for Lambda code update propagation and verify v2 content
          const response = await fetchWithRetry(distributionUrl, {
            expectedBodyContains: 'Hello SSR v2',
            maxRetries: 10,
            intervalMs: 15000,
          });
          const body = await response.text();
          assert.ok(
            body.includes('Hello SSR v2'),
            `Response body should contain "Hello SSR v2" after redeploy, got: ${body.substring(0, 200)}`,
          );

          // Verify SVG static asset still accessible
          const svgResponse = await fetchWithRetry(
            `${distributionUrl}/_next/static/logo.svg`,
            {
              expectedStatus: 200,
              maxRetries: 3,
              intervalMs: 5000,
            },
          );
          assert.strictEqual(
            svgResponse.status,
            200,
            `SVG should still be accessible after content redeploy, got ${svgResponse.status}`,
          );
        });

        void it('stage 3: redeploys with compute change and verifies infra update', async () => {
          // Apply stage 3 updates (infra change — memorySize)
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

          // Verify Lambda memory config changed to 512
          const ssrFunctionName = await findLambdaFunctionName(
            cfnClient,
            stackName,
          );
          assert.ok(
            ssrFunctionName,
            'Should find SSR Lambda function in stack',
          );

          const functionConfig = await lambdaClient.send(
            new GetFunctionCommand({ FunctionName: ssrFunctionName }),
          );
          assert.strictEqual(
            functionConfig.Configuration?.MemorySize,
            512,
            `Lambda memory should be 512 MB after infra change, got: ${functionConfig.Configuration?.MemorySize}`,
          );

          // Verify content still works
          const response = await fetchWithRetry(distributionUrl, {
            expectedBodyContains: 'Hello SSR v2',
            maxRetries: 6,
            intervalMs: 15000,
          });
          assert.strictEqual(
            response.status,
            200,
            `Expected HTTP 200 after infra change, got ${response.status}`,
          );
          const body = await response.text();
          assert.ok(
            body.includes('Hello SSR v2'),
            `Content should still be v2 after infra change, got: ${body.substring(0, 200)}`,
          );
        });
      });
    });
  },
);

/**
 * Find the SSR Lambda function physical resource name from stack resources.
 */
const findLambdaFunctionName = async (
  cfnClient: CloudFormationClient,
  stackName: string,
): Promise<string | undefined> => {
  const rootResources = await cfnClient.send(
    new ListStackResourcesCommand({ StackName: stackName }),
  );

  // Check nested stacks for Lambda function
  for (const r of rootResources.StackResourceSummaries ?? []) {
    if (
      r.ResourceType === 'AWS::CloudFormation::Stack' &&
      r.PhysicalResourceId
    ) {
      const nestedResources = await cfnClient.send(
        new ListStackResourcesCommand({ StackName: r.PhysicalResourceId }),
      );

      for (const nr of nestedResources.StackResourceSummaries ?? []) {
        if (nr.ResourceType === 'AWS::Lambda::Function') {
          // Skip custom resource Lambda functions — look for SSR function
          if (
            nr.LogicalResourceId?.includes('Ssr') ||
            nr.LogicalResourceId?.includes('ssr') ||
            nr.LogicalResourceId?.includes('Server')
          ) {
            return nr.PhysicalResourceId!;
          }
        }
      }

      // Check deeper nested stacks
      for (const nr of nestedResources.StackResourceSummaries ?? []) {
        if (
          nr.ResourceType === 'AWS::CloudFormation::Stack' &&
          nr.PhysicalResourceId
        ) {
          const deepResources = await cfnClient.send(
            new ListStackResourcesCommand({
              StackName: nr.PhysicalResourceId,
            }),
          );
          for (const dr of deepResources.StackResourceSummaries ?? []) {
            if (dr.ResourceType === 'AWS::Lambda::Function') {
              if (
                dr.LogicalResourceId?.includes('Ssr') ||
                dr.LogicalResourceId?.includes('ssr') ||
                dr.LogicalResourceId?.includes('Server')
              ) {
                return dr.PhysicalResourceId!;
              }
            }
          }
        }
      }
    }
  }

  // Fallback: return first Lambda function found (not a custom resource handler)
  for (const r of rootResources.StackResourceSummaries ?? []) {
    if (
      r.ResourceType === 'AWS::CloudFormation::Stack' &&
      r.PhysicalResourceId
    ) {
      const nestedResources = await cfnClient.send(
        new ListStackResourcesCommand({ StackName: r.PhysicalResourceId }),
      );

      for (const nr of nestedResources.StackResourceSummaries ?? []) {
        if (
          nr.ResourceType === 'AWS::Lambda::Function' &&
          !nr.LogicalResourceId?.includes('CustomResource') &&
          !nr.LogicalResourceId?.includes('BucketNotifications') &&
          !nr.LogicalResourceId?.includes('Provider')
        ) {
          return nr.PhysicalResourceId!;
        }

        // Check second-level nested
        if (
          nr.ResourceType === 'AWS::CloudFormation::Stack' &&
          nr.PhysicalResourceId
        ) {
          const deepResources = await cfnClient.send(
            new ListStackResourcesCommand({
              StackName: nr.PhysicalResourceId,
            }),
          );
          for (const dr of deepResources.StackResourceSummaries ?? []) {
            if (
              dr.ResourceType === 'AWS::Lambda::Function' &&
              !dr.LogicalResourceId?.includes('CustomResource') &&
              !dr.LogicalResourceId?.includes('BucketNotifications') &&
              !dr.LogicalResourceId?.includes('Provider')
            ) {
              return dr.PhysicalResourceId!;
            }
          }
        }
      }
    }
  }

  return undefined;
};

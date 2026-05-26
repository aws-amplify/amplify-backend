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
      let fullIdentifier: BackendIdentifier;
      let distributionUrl: string;
      let skewBuildIdA: string;
      let skewStaticAssetPath: string;

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
        fullIdentifier = {
          namespace,
          name: 'full',
          type: 'standalone',
        };
      });

      after(async () => {
        // Fire-and-forget: initiate stack deletions without waiting for completion.
        // CloudFront distributions can take 15-30 minutes to delete, which causes
        // CI timeouts when waiting synchronously. The stacks will continue deleting
        // in the background after the test process exits.
        const stacks = [frontendIdentifier, fullIdentifier, backendIdentifier];
        for (const id of stacks) {
          try {
            await testProject.tearDown(id);
          } catch {
            process.stderr.write(
              `⚠️ Failed to initiate stack deletion for ${id.name}. Check for orphaned resources.\n`,
            );
          }
        }
      });

      void describe('in sequence', { concurrency: false }, () => {
        void it('stage 1: deploys backend with auth, data, storage and validates amplify_outputs.json', async () => {
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

          // Parse and validate amplify_outputs.json contains expected backend resources
          const outputsPath = path.join(
            testProject.projectDirPath,
            'amplify_outputs.json',
          );
          const outputsContent = JSON.parse(
            await fsp.readFile(outputsPath, 'utf-8'),
          );

          // Verify auth config (user_pool_id)
          assert.ok(
            outputsContent.auth?.user_pool_id,
            `amplify_outputs.json should contain auth.user_pool_id, got: ${JSON.stringify(outputsContent.auth)}`,
          );

          // Verify data config (graphql endpoint)
          assert.ok(
            outputsContent.data?.url,
            `amplify_outputs.json should contain data.url (GraphQL endpoint), got: ${JSON.stringify(outputsContent.data)}`,
          );

          // Verify storage config (bucket name)
          const buckets = outputsContent.storage?.buckets;
          assert.ok(
            Array.isArray(buckets) && buckets.length > 0,
            `amplify_outputs.json should contain storage.buckets, got: ${JSON.stringify(outputsContent.storage)}`,
          );
          assert.ok(
            buckets[0].bucket_name,
            `amplify_outputs.json should contain a bucket_name, got: ${JSON.stringify(buckets[0])}`,
          );

          process.stderr.write(
            `Backend deployed. user_pool_id=${outputsContent.auth.user_pool_id}, graphql_url=${outputsContent.data.url}, bucket=${buckets[0].bucket_name}\n`,
          );

          // Copy amplify_outputs.json into dist/ so it is deployed as a static asset
          // (the hosting construct deploys from buildOutputDir which resolves to dist/)
          const distOutputsPath = path.join(
            testProject.projectDirPath,
            'dist',
            'amplify_outputs.json',
          );
          await fsp.cp(outputsPath, distOutputsPath);
          process.stderr.write(
            `Copied amplify_outputs.json into dist/ for frontend deployment\n`,
          );
        });

        void it('stage 2: deploys frontend and validates CloudFront URL + backend outputs served', async () => {
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

          // Verify amplify_outputs.json is served as a static asset from CloudFront
          const outputsResponse = await fetchWithRetry(
            `${distributionUrl}/amplify_outputs.json`,
            {
              expectedStatus: 200,
              maxRetries: 3,
              intervalMs: 5000,
            },
          );
          assert.strictEqual(
            outputsResponse.status,
            200,
            `Expected HTTP 200 for amplify_outputs.json, got ${outputsResponse.status}`,
          );
          const servedOutputsText = await outputsResponse.text();
          const servedOutputs = JSON.parse(servedOutputsText);
          assert.ok(
            servedOutputs.auth?.user_pool_id,
            `Served amplify_outputs.json should contain auth.user_pool_id, got: ${JSON.stringify(servedOutputs.auth)}`,
          );
          assert.ok(
            servedOutputs.data?.url,
            `Served amplify_outputs.json should contain data.url, got: ${JSON.stringify(servedOutputs.data)}`,
          );
          const servedBuckets = servedOutputs.storage?.buckets;
          assert.ok(
            Array.isArray(servedBuckets) && servedBuckets.length > 0,
            `Served amplify_outputs.json should contain storage.buckets, got: ${JSON.stringify(servedOutputs.storage)}`,
          );
          assert.ok(
            servedBuckets[0].bucket_name,
            `Served amplify_outputs.json should contain a bucket_name, got: ${JSON.stringify(servedBuckets[0])}`,
          );
          process.stderr.write(
            `amplify_outputs.json served from CloudFront with valid backend resources\n`,
          );

          await testProject.assertPostDeployment(backendIdentifier);
        });

        void it('stage 2b: skew protection — captures build A cookie and static asset path', async () => {
          // Fetch HTML page and capture the __dpl skew protection cookie
          const initialResponse = await fetch(distributionUrl, {
            redirect: 'manual',
          });
          const setCookieHeader =
            initialResponse.headers.get('set-cookie') ?? '';
          const buildIdMatch = setCookieHeader.match(/__dpl=([^;]+)/);
          assert.ok(
            buildIdMatch,
            `Skew protection cookie (__dpl) should be set on HTML response, got set-cookie: ${setCookieHeader.substring(0, 200)}`,
          );
          skewBuildIdA = buildIdMatch![1];
          process.stderr.write(
            `Skew protection: captured build A cookie __dpl=${skewBuildIdA}\n`,
          );

          // Extract a static asset path from the HTML to verify skew-pinned access later
          const htmlBody = await initialResponse.text();
          const assetMatch = htmlBody.match(/\/assets\/[^"'\s]+\.(js|css)/);
          assert.ok(
            assetMatch,
            `Page HTML should contain /assets/ asset references for skew test, got: ${htmlBody.substring(0, 300)}`,
          );
          skewStaticAssetPath = assetMatch![0];
          process.stderr.write(
            `Skew protection: captured static asset path ${skewStaticAssetPath}\n`,
          );
        });

        void it('stage 3: applies v2 changes and full deploys — validates v2 content, outputs, and infra change', async () => {
          // Apply combined v2 update (content change + access logging)
          const updates = await testProject.getUpdates();
          const v2Update = updates[0];
          for (const replacement of v2Update.replacements) {
            await fsp.cp(replacement.source, replacement.destination, {
              force: true,
            });
          }

          // Copy amplify_outputs.json into dist/ again for the v2 deploy
          const outputsPath = path.join(
            testProject.projectDirPath,
            'amplify_outputs.json',
          );
          const distOutputsPath = path.join(
            testProject.projectDirPath,
            'dist',
            'amplify_outputs.json',
          );
          await fsp.cp(outputsPath, distOutputsPath);

          // Full deploy (no --backend / --frontend flag) to update everything
          await testProject.deploy(fullIdentifier);

          // Verify v2 content is served (wait for CloudFront cache to update)
          const response = await fetchWithRetry(distributionUrl, {
            expectedBodyContains: 'Hello SPA v2',
            maxRetries: 10,
            intervalMs: 15000,
          });
          const body = await response.text();
          assert.ok(
            body.includes('Hello SPA v2'),
            `Response body should contain "Hello SPA v2" after full deploy, got: ${body.substring(0, 200)}`,
          );
          assert.ok(
            !body.includes('Hello SPA v1'),
            'Response body should NOT contain "Hello SPA v1" after full deploy',
          );

          // Verify amplify_outputs.json is still valid after full deploy
          const outputsResponse = await fetchWithRetry(
            `${distributionUrl}/amplify_outputs.json`,
            {
              expectedStatus: 200,
              maxRetries: 3,
              intervalMs: 5000,
            },
          );
          const servedOutputsText = await outputsResponse.text();
          const servedOutputs = JSON.parse(servedOutputsText);
          assert.ok(
            servedOutputs.auth?.user_pool_id,
            `amplify_outputs.json should still contain auth.user_pool_id after full deploy`,
          );
          assert.ok(
            servedOutputs.data?.url,
            `amplify_outputs.json should still contain data.url after full deploy`,
          );
          assert.ok(
            Array.isArray(servedOutputs.storage?.buckets) &&
              servedOutputs.storage.buckets.length > 0,
            `amplify_outputs.json should still contain storage.buckets after full deploy`,
          );

          // Verify infra change: access logging bucket should be present
          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);

          // Check for the access logging bucket in the frontend stack
          // (full deploy may have updated the frontend stack or created a new combined stack)
          let s3BucketCount = 0;
          try {
            const allResourceTypes = await getAllResourceTypes(
              cfnClient,
              frontendStackName,
            );
            s3BucketCount = allResourceTypes.filter(
              (t) => t === 'AWS::S3::Bucket',
            ).length;
          } catch {
            // If frontend stack was superseded by full deploy, check the full stack
            const fullStackName =
              BackendIdentifierConversions.toStackName(fullIdentifier);
            const allResourceTypes = await getAllResourceTypes(
              cfnClient,
              fullStackName,
            );
            s3BucketCount = allResourceTypes.filter(
              (t) => t === 'AWS::S3::Bucket',
            ).length;
          }
          assert.ok(
            s3BucketCount >= 2,
            `Stack should have at least 2 S3 buckets (hosting + access log) after enabling access logging, got: ${s3BucketCount}`,
          );
        });

        void it('stage 3b: skew protection — verifies old build assets accessible with pinned cookie', async () => {
          // After full redeploy (build B), verify skew protection keeps build A assets accessible
          assert.ok(
            skewBuildIdA,
            'skewBuildIdA should have been captured in stage 2b',
          );
          assert.ok(
            skewStaticAssetPath,
            'skewStaticAssetPath should have been captured in stage 2b',
          );

          // Verify old build assets are still accessible when pinned via __dpl cookie
          const skewResponse = await fetchWithRetry(
            `${distributionUrl}${skewStaticAssetPath}`,
            {
              expectedStatus: 200,
              maxRetries: 3,
              intervalMs: 5000,
              fetchInit: { headers: { Cookie: `__dpl=${skewBuildIdA}` } },
            },
          );
          assert.strictEqual(
            skewResponse.status,
            200,
            `Old build static asset should still be accessible with pinned __dpl cookie, got ${skewResponse.status}`,
          );
          process.stderr.write(
            `Skew protection: old asset accessible with build A cookie (status=${skewResponse.status})\n`,
          );

          // Verify new build gets a different __dpl cookie
          const newResponse = await fetch(distributionUrl, {
            redirect: 'manual',
          });
          const newSetCookie = newResponse.headers.get('set-cookie') ?? '';
          const buildIdBMatch = newSetCookie.match(/__dpl=([^;]+)/);
          assert.ok(
            buildIdBMatch,
            `New build should set __dpl cookie, got set-cookie: ${newSetCookie.substring(0, 200)}`,
          );
          const buildIdB = buildIdBMatch![1];
          assert.notStrictEqual(
            skewBuildIdA,
            buildIdB,
            `Build ID should change after redeploy: buildA=${skewBuildIdA}, buildB=${buildIdB}`,
          );
          process.stderr.write(
            `Skew protection: build ID changed from ${skewBuildIdA} to ${buildIdB}\n`,
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

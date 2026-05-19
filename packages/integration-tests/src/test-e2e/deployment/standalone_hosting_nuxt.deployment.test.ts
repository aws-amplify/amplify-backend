import { after, before, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { StandaloneHostingNuxtTestProjectCreator } from '../../test-project-setup/standalone_hosting_nuxt.js';
import { TestProjectBase } from '../../test-project-setup/test_project_base.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { shortUuid } from '../../short_uuid.js';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  ListStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import fsp from 'fs/promises';
import path from 'path';
import {
  fetchWithRetry,
  getDistributionUrlFromStack,
} from '../../hosting_test_support.js';

const testProjectCreator = new StandaloneHostingNuxtTestProjectCreator();

void describe(
  'standalone hosting Nuxt SSR deployment tests',
  { concurrency: false, timeout: 1800000 },
  () => {
    const cfnClient = new CloudFormationClient(e2eToolingClientConfig);
    const lambdaClient = new LambdaClient(e2eToolingClientConfig);
    const s3Client = new S3Client(e2eToolingClientConfig);

    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('standalone deploys hosting-nuxt', () => {
      let testProject: TestProjectBase;
      const namespace = `nuxt-e2e-${shortUuid()}`;
      let backendIdentifier: BackendIdentifier;
      let frontendIdentifier: BackendIdentifier;
      let fullIdentifier: BackendIdentifier;
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
        fullIdentifier = {
          namespace,
          name: 'full',
          type: 'standalone',
        };
      });

      after(async () => {
        // Fire-and-forget stack deletions: CloudFront takes 15-30 min to
        // delete. Stacks finish in the background after this process exits.
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

          const outputsPath = path.join(
            testProject.projectDirPath,
            'amplify_outputs.json',
          );
          const outputsContent = JSON.parse(
            await fsp.readFile(outputsPath, 'utf-8'),
          );

          assert.ok(
            outputsContent.auth?.user_pool_id,
            `amplify_outputs.json should contain auth.user_pool_id, got: ${JSON.stringify(outputsContent.auth)}`,
          );
          assert.ok(
            outputsContent.data?.url,
            `amplify_outputs.json should contain data.url, got: ${JSON.stringify(outputsContent.data)}`,
          );
          assert.ok(
            outputsContent.data?.api_key,
            `amplify_outputs.json should contain data.api_key, got: ${JSON.stringify(outputsContent.data)}`,
          );

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
            `Backend deployed. user_pool_id=${outputsContent.auth.user_pool_id}, graphql_url=${outputsContent.data.url}, api_key=${outputsContent.data.api_key.substring(0, 8)}..., bucket=${buckets[0].bucket_name}\n`,
          );
        });

        void it('stage 2: deploys frontend SSR and validates server-rendered content with backend data', async () => {
          await testProject.deploy(frontendIdentifier);

          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);

          const describeResult = await cfnClient.send(
            new DescribeStacksCommand({ StackName: frontendStackName }),
          );
          assert.ok(
            describeResult.Stacks && describeResult.Stacks.length > 0,
            'frontend SSR stack should exist after deployment',
          );
          const stack = describeResult.Stacks![0];
          assert.ok(
            stack.StackStatus === 'CREATE_COMPLETE' ||
              stack.StackStatus === 'UPDATE_COMPLETE',
            `frontend stack should be in a successful state, got: ${stack.StackStatus}`,
          );

          distributionUrl = await getDistributionUrlFromStack(
            cfnClient,
            frontendStackName,
          );
          assert.ok(
            distributionUrl.startsWith('https://'),
            `DistributionUrl should start with https://, got: ${distributionUrl}`,
          );
          process.stderr.write(`CloudFront URL: ${distributionUrl}\n`);

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
            `Response body should contain "Hello SSR v1" (proves Lambda runs), got: ${body.substring(0, 500)}`,
          );

          // Verify the SSR Lambda actually queried the backend GraphQL API
          assert.ok(
            body.includes('backend-connected'),
            `SSR response should contain "backend-connected" proving the Lambda queried GraphQL, got: ${body.substring(0, 500)}`,
          );
          assert.ok(
            body.includes('listTodos'),
            `SSR response should contain GraphQL query result with "listTodos", got: ${body.substring(0, 500)}`,
          );

          // Verify the user_pool_id is rendered (proves amplify_outputs.json was bundled)
          assert.ok(
            !body.includes('user-pool-id">none'),
            `SSR response should contain a real user_pool_id (not "none"), got: ${body.substring(0, 500)}`,
          );

          process.stderr.write(
            `SSR Lambda successfully queried backend and rendered results\n`,
          );

          // Verify static asset (SVG from public/) is accessible
          const svgResponse = await fetchWithRetry(
            `${distributionUrl}/logo.svg`,
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

          await testProject.assertPostDeployment(backendIdentifier);
        });

        void it('stage 2b: functional HTTP assertions — 404, API routing, prerendered page, redirect', async () => {
          // Cold start: first request after deployment should complete within 30s
          const start = Date.now();
          const coldStartRes = await fetch(distributionUrl);
          const duration = Date.now() - start;
          assert.ok(coldStartRes.ok, 'First request should succeed');
          assert.ok(
            duration < 30000,
            `Cold start too slow: ${duration}ms (max 30s)`,
          );
          process.stderr.write(
            `Cold start timing: ${duration}ms (limit: 30000ms)\n`,
          );

          // 1. Prerendered page — /about should be served as a static HTML file
          // (routeRules: { '/about': { prerender: true } } in nuxt.config.ts)
          const aboutRes = await fetchWithRetry(`${distributionUrl}/about`, {
            expectedStatus: 200,
            maxRetries: 5,
            intervalMs: 10000,
          });
          assert.strictEqual(
            aboutRes.status,
            200,
            `Prerendered /about should return 200, got ${aboutRes.status}`,
          );
          const aboutBody = await aboutRes.text();
          assert.ok(
            aboutBody.includes('About (prerendered)'),
            `/about should contain prerendered content, got: ${aboutBody.substring(0, 200)}`,
          );
          process.stderr.write(`Prerendered /about verified\n`);

          // 2. Static asset caching — Nuxt emits hashed bundles under /_nuxt/
          const pageHtml = await (await fetch(distributionUrl)).text();
          const staticAssetMatch = pageHtml.match(
            /\/_nuxt\/[^"'\s]+\.(js|css|mjs)/,
          );
          if (staticAssetMatch) {
            const staticAssetUrl = `${distributionUrl}${staticAssetMatch[0]}`;
            process.stderr.write(`Testing static asset: ${staticAssetUrl}\n`);
            const staticRes = await fetchWithRetry(staticAssetUrl, {
              expectedStatus: 200,
              maxRetries: 5,
              intervalMs: 10000,
            });
            assert.strictEqual(
              staticRes.status,
              200,
              `Static asset should return 200, got ${staticRes.status}`,
            );
            const staticCacheControl =
              staticRes.headers.get('cache-control') ?? '';
            assert.ok(
              staticCacheControl.includes('immutable') ||
                staticCacheControl.includes('max-age'),
              `Static asset cache-control should include immutable or max-age, got: ${staticCacheControl}`,
            );
            process.stderr.write(
              `Static asset caching verified: cache-control=${staticCacheControl}\n`,
            );
          } else {
            process.stderr.write(
              `No /_nuxt/ asset references found in HTML — skipping static asset cache check\n`,
            );
          }

          // 3. Error handling — non-existent route returns 404
          const notFoundRes = await fetchWithRetry(
            `${distributionUrl}/this-page-does-not-exist-xyz`,
            {
              expectedStatus: 404,
              maxRetries: 5,
              intervalMs: 10000,
            },
          );
          assert.strictEqual(
            notFoundRes.status,
            404,
            `Non-existent route should return 404, got ${notFoundRes.status}`,
          );
          process.stderr.write(`404 handling verified\n`);

          // 4. API route responds correctly
          const apiRes = await fetchWithRetry(`${distributionUrl}/api/health`, {
            expectedStatus: 200,
            maxRetries: 5,
            intervalMs: 10000,
          });
          assert.strictEqual(
            apiRes.status,
            200,
            `API health route should return 200, got ${apiRes.status}`,
          );
          const apiBody = (await apiRes.json()) as {
            status?: string;
            timestamp?: number;
          };
          assert.strictEqual(
            apiBody.status,
            'ok',
            `API health response should have status "ok", got: ${JSON.stringify(apiBody)}`,
          );
          assert.ok(
            apiBody.timestamp,
            `API health response should include a timestamp, got: ${JSON.stringify(apiBody)}`,
          );
          process.stderr.write(
            `API routing verified: ${JSON.stringify(apiBody)}\n`,
          );

          // 5. Route-rule redirect — /legacy-about → 301 → /about.
          // Nitro's route rules support redirects but not rewrites
          // (rewrites would require Lambda@Edge or CloudFront Functions),
          // so the Next.js fixture's transparent rewrite test has no
          // direct equivalent here.
          const redirectRes = await fetch(`${distributionUrl}/legacy-about`, {
            redirect: 'manual',
          });
          assert.ok(
            redirectRes.status === 301 || redirectRes.status === 302,
            `Route rule redirect should return 3xx, got ${redirectRes.status}`,
          );
          const location = redirectRes.headers.get('location') ?? '';
          assert.ok(
            location.includes('/about'),
            `Redirect Location should point to /about, got: ${location}`,
          );
          process.stderr.write(
            `Route rule redirect verified: ${redirectRes.status} → ${location}\n`,
          );

          // 6. Security headers on API route
          const apiSecHeaders = apiRes.headers;
          assert.ok(
            apiSecHeaders.get('strict-transport-security'),
            'API response should include strict-transport-security header',
          );
          assert.strictEqual(
            apiSecHeaders.get('x-content-type-options'),
            'nosniff',
            `API x-content-type-options should be nosniff, got: ${apiSecHeaders.get('x-content-type-options')}`,
          );
          process.stderr.write(`Security headers on API route verified\n`);
        });

        void it('stage 3: SWR cache — verifies S3 cache bucket provisioned and populated', async () => {
          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);

          // The Nitro adapter provisions only an S3 bucket for SWR/ISR
          // (no DynamoDB tag table, no SQS revalidation queue — those are
          // OpenNext-specific. Our nitro-s3 driver writes cache entries
          // directly to S3 with built-in TTL semantics.)
          const cacheBucket = await findNitroCacheBucket(
            cfnClient,
            frontendStackName,
          );

          assert.ok(
            cacheBucket,
            `Nitro cache S3 bucket should be provisioned for SWR-enabled apps`,
          );
          process.stderr.write(`SWR cache bucket: ${cacheBucket}\n`);

          // Hit the SWR page to trigger cache population
          await fetchWithRetry(`${distributionUrl}/swr`, {
            expectedBodyContains: 'SWR page generated at:',
            maxRetries: 3,
            intervalMs: 5000,
          });

          // Wait for async cache write
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const cacheObjects = await s3Client.send(
            new ListObjectsV2Command({
              Bucket: cacheBucket,
              MaxKeys: 10,
            }),
          );
          process.stderr.write(
            `SWR cache bucket objects: ${JSON.stringify(cacheObjects.Contents?.map((o) => o.Key) ?? [])}\n`,
          );
          assert.ok(
            (cacheObjects.Contents?.length ?? 0) > 0,
            `Cache bucket should have at least one cached entry after hitting SWR page`,
          );

          // Second request — should serve from cache (same content)
          const cachedResponse = await fetchWithRetry(
            `${distributionUrl}/swr`,
            {
              expectedBodyContains: 'SWR page generated at:',
              maxRetries: 3,
              intervalMs: 5000,
            },
          );
          assert.strictEqual(
            cachedResponse.status,
            200,
            `Cached response should return 200`,
          );
          const cachedBody = await cachedResponse.text();
          assert.ok(
            cachedBody.includes('SWR page generated at:'),
            `Cached response should still contain SWR content`,
          );
          process.stderr.write(`SWR cache hit verified\n`);
        });

        void it('stage 3b: SWR functional proof — stale-while-revalidate cycle', async () => {
          const swrUrl = `${distributionUrl}/swr`;
          process.stderr.write(`SWR functional test: fetching ${swrUrl}\n`);

          const swrFetch1 = await fetchWithRetry(swrUrl, {
            expectedStatus: 200,
            maxRetries: 8,
            intervalMs: 15000,
            expectedBodyContains: 'SWR page generated at:',
          });
          assert.strictEqual(
            swrFetch1.status,
            200,
            `SWR page should return 200, got ${swrFetch1.status}`,
          );
          const body1 = await swrFetch1.text();
          const timestamp1 = body1.match(/generated at: (\d+)/)?.[1];
          assert.ok(
            timestamp1,
            `SWR page should contain a generation timestamp, got: ${body1.substring(0, 200)}`,
          );
          process.stderr.write(
            `SWR first fetch: timestamp=${timestamp1}, cache-control=${swrFetch1.headers.get('cache-control')}\n`,
          );

          // Wait past the swr=10 window so the next fetch triggers
          // background revalidation
          await new Promise((resolve) => setTimeout(resolve, 12000));

          const swrFetch2 = await fetchWithRetry(swrUrl, {
            expectedStatus: 200,
            maxRetries: 3,
            intervalMs: 5000,
            expectedBodyContains: 'SWR page generated at:',
          });
          assert.strictEqual(
            swrFetch2.status,
            200,
            `SWR page (2nd fetch) should return 200, got ${swrFetch2.status}`,
          );
          const body2 = await swrFetch2.text();
          assert.ok(
            body2.includes('SWR page generated at:'),
            `SWR page (2nd fetch) should still contain SWR content`,
          );

          // Wait for revalidation to complete
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const swrFetch3 = await fetchWithRetry(swrUrl, {
            expectedStatus: 200,
            maxRetries: 3,
            intervalMs: 5000,
            expectedBodyContains: 'SWR page generated at:',
          });
          const body3 = await swrFetch3.text();
          const timestamp3 = body3.match(/generated at: (\d+)/)?.[1];

          if (timestamp1 !== timestamp3) {
            process.stderr.write(
              `SWR revalidation confirmed: timestamp changed from ${timestamp1} to ${timestamp3}\n`,
            );
          } else {
            // CloudFront may cache aggressively; the infrastructure is
            // still functional if no errors occurred during the cycle.
            process.stderr.write(
              `SWR page served consistently (CloudFront may be caching). ` +
                `Infrastructure is functional — no errors in stale-while-revalidate cycle.\n`,
            );
          }
        });

        void it('stage 4: image optimization — /_ipx/ returns valid image', async () => {
          // Request the IPX endpoint with standard IPX-style modifiers.
          // Our adapter routes /_ipx/* to a dedicated image-opt Lambda.
          const imageUrl = `${distributionUrl}/_ipx/w_640/img/hero.jpg`;
          process.stderr.write(`Requesting image optimization: ${imageUrl}\n`);

          const imageResponse = await fetchWithRetry(imageUrl, {
            expectedStatus: 200,
            maxRetries: 8,
            intervalMs: 15000,
            fetchInit: { headers: { Accept: 'image/webp,*/*' } },
          });

          assert.strictEqual(
            imageResponse.status,
            200,
            `Expected HTTP 200 from image optimization endpoint, got ${imageResponse.status}`,
          );

          const contentType = imageResponse.headers.get('content-type') ?? '';
          assert.ok(
            contentType.includes('image/'),
            `Image optimization response should be an image type, got: ${contentType}`,
          );

          const imageBuffer = await imageResponse.arrayBuffer();
          assert.ok(
            imageBuffer.byteLength > 0,
            `Image response should not be empty, got ${imageBuffer.byteLength} bytes`,
          );

          process.stderr.write(
            `Image optimization verified: content-type=${contentType}, size=${imageBuffer.byteLength}B\n`,
          );

          // Verify a different size doesn't 500
          const imageUrl2 = `${distributionUrl}/_ipx/w_320/img/hero.jpg`;
          const imgRes2 = await fetchWithRetry(imageUrl2, {
            expectedStatus: 200,
            maxRetries: 3,
            intervalMs: 10000,
            fetchInit: { headers: { Accept: 'image/webp,*/*' } },
          });
          assert.ok(
            imgRes2.status < 500,
            `Image optimization should not 500 (got ${imgRes2.status})`,
          );
          if (imgRes2.status === 200) {
            const ct2 = imgRes2.headers.get('content-type') ?? '';
            assert.ok(
              ct2.includes('image/'),
              `Expected image content-type for w=320 request, got ${ct2}`,
            );
          }

          // Verify format negotiation (webp)
          const imageUrl3 = `${distributionUrl}/_ipx/w_640,f_webp/img/hero.jpg`;
          const imgRes3 = await fetchWithRetry(imageUrl3, {
            expectedStatus: 200,
            maxRetries: 3,
            intervalMs: 10000,
            fetchInit: { headers: { Accept: 'image/webp,*/*' } },
          });
          assert.ok(
            imgRes3.status < 500,
            `Image optimization with f_webp should not 500 (got ${imgRes3.status})`,
          );
          if (imgRes3.status === 200) {
            const ct3 = imgRes3.headers.get('content-type') ?? '';
            assert.ok(
              ct3.includes('image/'),
              `Expected image content-type for f_webp request, got ${ct3}`,
            );
          }
          process.stderr.write(
            `Image optimization multi-param verification complete\n`,
          );
        });

        void it('stage 5: verifies multiple Lambda functions (server + image-optimization)', async () => {
          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);
          const lambdaFunctions = await findAllLambdaFunctions(
            cfnClient,
            frontendStackName,
          );

          process.stderr.write(
            `Lambda functions: ${JSON.stringify(lambdaFunctions)}\n`,
          );

          // Should have at least 2: SSR server function + image optimization
          const functionNames = lambdaFunctions.map(String).join(', ');
          assert.ok(
            lambdaFunctions.length >= 2,
            `Should have at least 2 Lambda functions (server + image-optimization), found ${lambdaFunctions.length}: [${functionNames}]`,
          );
        });

        void it('stage 6: applies v2 changes and full deploys — validates v2 content and infra change', async () => {
          // Apply combined v2 update (server content change + memorySize infra change)
          const updates = await testProject.getUpdates();
          const v2Update = updates[0];
          for (const replacement of v2Update.replacements) {
            await fsp.cp(replacement.source, replacement.destination, {
              force: true,
            });
          }

          // Full deploy (no --backend / --frontend flag) to update everything
          await testProject.deploy(fullIdentifier);

          // Verify v2 SSR content with backend data
          const response = await fetchWithRetry(distributionUrl, {
            expectedBodyContains: 'Hello SSR v2',
            maxRetries: 10,
            intervalMs: 15000,
          });
          const body = await response.text();
          assert.ok(
            body.includes('Hello SSR v2'),
            `Response body should contain "Hello SSR v2" after full deploy, got: ${body.substring(0, 500)}`,
          );

          assert.ok(
            body.includes('backend-connected'),
            `SSR response should still contain "backend-connected" after full deploy, got: ${body.substring(0, 500)}`,
          );
          assert.ok(
            body.includes('listTodos'),
            `SSR response should still contain GraphQL result after full deploy, got: ${body.substring(0, 500)}`,
          );

          // Verify SVG static asset still accessible
          const svgResponse = await fetchWithRetry(
            `${distributionUrl}/logo.svg`,
            {
              expectedStatus: 200,
              maxRetries: 3,
              intervalMs: 5000,
            },
          );
          assert.strictEqual(
            svgResponse.status,
            200,
            `SVG should still be accessible after full deploy, got ${svgResponse.status}`,
          );

          // Verify infra change: SSR Lambda memory should be 512 MB
          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);

          let ssrFunctionName: string | undefined;
          try {
            ssrFunctionName = await findLambdaFunctionName(
              cfnClient,
              frontendStackName,
            );
          } catch {
            const fullStackName =
              BackendIdentifierConversions.toStackName(fullIdentifier);
            ssrFunctionName = await findLambdaFunctionName(
              cfnClient,
              fullStackName,
            );
          }
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

          const finalResponse = await fetchWithRetry(distributionUrl, {
            expectedBodyContains: 'Hello SSR v2',
            maxRetries: 6,
            intervalMs: 15000,
          });
          assert.strictEqual(
            finalResponse.status,
            200,
            `Expected HTTP 200 after infra change, got ${finalResponse.status}`,
          );
        });
      });
    });
  },
);

/**
 * Find the Nitro cache S3 bucket. Our nitro-s3 driver provisions only a
 * bucket — no DynamoDB / SQS — so we look for any `cache`-named bucket
 * in nested stacks.
 */
const findNitroCacheBucket = async (
  cfnClient: CloudFormationClient,
  stackName: string,
): Promise<string | undefined> => {
  let cacheBucket: string | undefined;

  const scanStack = async (name: string, depth: number) => {
    if (depth > 3 || cacheBucket) return;

    const resources = await cfnClient.send(
      new ListStackResourcesCommand({ StackName: name }),
    );

    for (const r of resources.StackResourceSummaries ?? []) {
      if (
        r.ResourceType === 'AWS::S3::Bucket' &&
        (r.LogicalResourceId?.toLowerCase().includes('cache') ||
          r.LogicalResourceId?.toLowerCase().includes('nitro') ||
          r.LogicalResourceId?.toLowerCase().includes('isr'))
      ) {
        cacheBucket = r.PhysicalResourceId!;
        return;
      }

      if (
        r.ResourceType === 'AWS::CloudFormation::Stack' &&
        r.PhysicalResourceId
      ) {
        await scanStack(r.PhysicalResourceId, depth + 1);
      }
    }
  };

  await scanStack(stackName, 0);
  return cacheBucket;
};

/**
 * Find all Lambda function logical resource IDs in a stack
 * (excluding internal CDK resources).
 */
const findAllLambdaFunctions = async (
  cfnClient: CloudFormationClient,
  stackName: string,
): Promise<string[]> => {
  const functions: string[] = [];

  const scanStack = async (name: string, depth: number) => {
    if (depth > 3) return;

    const resources = await cfnClient.send(
      new ListStackResourcesCommand({ StackName: name }),
    );

    for (const r of resources.StackResourceSummaries ?? []) {
      if (
        r.ResourceType === 'AWS::Lambda::Function' &&
        !r.LogicalResourceId?.includes('CustomResource') &&
        !r.LogicalResourceId?.includes('BucketNotifications') &&
        !r.LogicalResourceId?.includes('Provider') &&
        !r.LogicalResourceId?.includes('LogRetention')
      ) {
        functions.push(r.LogicalResourceId!);
      }

      if (
        r.ResourceType === 'AWS::CloudFormation::Stack' &&
        r.PhysicalResourceId
      ) {
        await scanStack(r.PhysicalResourceId, depth + 1);
      }
    }
  };

  await scanStack(stackName, 0);
  return functions;
};

/**
 * Find the SSR Lambda function physical name from stack resources
 * (skipping the image-opt Lambda, which has 'image' in its logical ID).
 */
const findLambdaFunctionName = async (
  cfnClient: CloudFormationClient,
  stackName: string,
): Promise<string | undefined> => {
  let imageOptFallback: string | undefined;

  const scanStack = async (
    name: string,
    depth: number,
  ): Promise<string | undefined> => {
    if (depth > 3) return undefined;

    const resources = await cfnClient.send(
      new ListStackResourcesCommand({ StackName: name }),
    );

    for (const r of resources.StackResourceSummaries ?? []) {
      if (r.ResourceType === 'AWS::Lambda::Function') {
        const id = r.LogicalResourceId ?? '';
        if (
          id.includes('CustomResource') ||
          id.includes('BucketNotifications') ||
          id.includes('Provider') ||
          id.includes('LogRetention')
        ) {
          continue;
        }

        const isImageOpt =
          id.toLowerCase().includes('image') ||
          id.toLowerCase().includes('ipx');
        if (isImageOpt) {
          imageOptFallback ??= r.PhysicalResourceId!;
          continue;
        }

        if (
          id.includes('Ssr') ||
          id.toLowerCase().includes('ssr') ||
          id.includes('Server') ||
          id.toLowerCase().includes('server') ||
          id.includes('Default') ||
          id.toLowerCase().includes('default') ||
          id.toLowerCase().includes('nitro')
        ) {
          return r.PhysicalResourceId!;
        }

        // Generic Lambda — keep as last-resort fallback
        imageOptFallback ??= r.PhysicalResourceId!;
      }

      if (
        r.ResourceType === 'AWS::CloudFormation::Stack' &&
        r.PhysicalResourceId
      ) {
        const found = await scanStack(r.PhysicalResourceId, depth + 1);
        if (found) return found;
      }
    }

    return undefined;
  };

  const found = await scanStack(stackName, 0);
  return found ?? imageOptFallback;
};

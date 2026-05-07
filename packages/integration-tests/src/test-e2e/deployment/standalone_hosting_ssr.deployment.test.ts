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
import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import {
  S3Client,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import fsp from 'fs/promises';
import path from 'path';
import {
  fetchWithRetry,
  getDistributionUrlFromStack,
} from '../../hosting_test_support.js';

const testProjectCreator = new StandaloneHostingSsrTestProjectCreator();

void describe(
  'standalone hosting SSR deployment tests',
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

    void describe('standalone deploys hosting-ssr', () => {
      let testProject: TestProjectBase;
      const namespace = `standalone-e2e-${shortUuid()}`;
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

          // Verify data config (graphql endpoint + api key for SSR queries)
          assert.ok(
            outputsContent.data?.url,
            `amplify_outputs.json should contain data.url (GraphQL endpoint), got: ${JSON.stringify(outputsContent.data)}`,
          );
          assert.ok(
            outputsContent.data?.api_key,
            `amplify_outputs.json should contain data.api_key for SSR Lambda queries, got: ${JSON.stringify(outputsContent.data)}`,
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
            `Backend deployed. user_pool_id=${outputsContent.auth.user_pool_id}, graphql_url=${outputsContent.data.url}, api_key=${outputsContent.data.api_key.substring(0, 8)}..., bucket=${buckets[0].bucket_name}\n`,
          );

          // Copy amplify_outputs.json into .open-next/server-function/ so the handler can read it
          const serverFnDir = path.join(
            testProject.projectDirPath,
            '.open-next',
            'server-function',
          );
          await fsp.cp(
            outputsPath,
            path.join(serverFnDir, 'amplify_outputs.json'),
          );
          process.stderr.write(
            `Copied amplify_outputs.json into .open-next/server-function/ for SSR Lambda\n`,
          );
        });

        void it('stage 2: deploys frontend SSR and validates server-rendered content with backend data', async () => {
          await testProject.deploy(frontendIdentifier);

          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);

          // Verify frontend stack deployed successfully
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

          // Verify the user_pool_id is rendered (proves amplify_outputs.json was read)
          assert.ok(
            !body.includes('user-pool-id">none'),
            `SSR response should contain a real user_pool_id (not "none"), got: ${body.substring(0, 500)}`,
          );

          process.stderr.write(
            `SSR Lambda successfully queried backend and rendered results\n`,
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

        void it('stage 3: ISR — verifies cache infrastructure provisioned and S3 cache populated', async () => {
          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);

          // Verify ISR infrastructure was provisioned (S3 cache bucket + DynamoDB + SQS)
          const isrResources = await findIsrResources(
            cfnClient,
            frontendStackName,
          );

          assert.ok(
            isrResources.cacheBucket,
            `ISR cache S3 bucket should be provisioned for Next.js apps with ISR enabled`,
          );
          process.stderr.write(
            `ISR infrastructure: bucket=${isrResources.cacheBucket}, dynamodb=${isrResources.dynamoTable}, sqs=${isrResources.sqsQueue}\n`,
          );

          // Hit the page to trigger cache population
          await fetchWithRetry(distributionUrl, {
            expectedBodyContains: 'Hello SSR v1',
            maxRetries: 3,
            intervalMs: 5000,
          });

          // Wait for async cache write
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Verify the cache bucket has content
          if (isrResources.cacheBucket) {
            const cacheObjects = await s3Client.send(
              new ListObjectsV2Command({
                Bucket: isrResources.cacheBucket,
                MaxKeys: 10,
              }),
            );
            process.stderr.write(
              `ISR cache bucket objects: ${JSON.stringify(cacheObjects.Contents?.map((o) => o.Key) ?? [])}\n`,
            );
            assert.ok(
              (cacheObjects.Contents?.length ?? 0) > 0,
              `ISR cache bucket should have at least one cached entry after hitting SSR page`,
            );
          }

          // Second request — should serve from cache (same content)
          const cachedResponse = await fetchWithRetry(distributionUrl, {
            expectedBodyContains: 'Hello SSR v1',
            maxRetries: 3,
            intervalMs: 5000,
          });
          assert.strictEqual(
            cachedResponse.status,
            200,
            `Cached response should return 200`,
          );
          const cachedBody = await cachedResponse.text();
          assert.ok(
            cachedBody.includes('Hello SSR v1'),
            `Cached response should still contain "Hello SSR v1"`,
          );
          process.stderr.write(`ISR cache hit verified\n`);
        });

        void it('stage 4: ISR — verifies DynamoDB tag table and SQS revalidation queue provisioned', async () => {
          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);
          const isrResources = await findIsrResources(
            cfnClient,
            frontendStackName,
          );

          // DynamoDB table for tag-based revalidation (revalidateTag/revalidatePath)
          assert.ok(
            isrResources.dynamoTable,
            `DynamoDB table for tag-based revalidation should be provisioned. ` +
              `This supports revalidateTag() and revalidatePath() in Next.js App Router.`,
          );

          // SQS queue for async background revalidation
          assert.ok(
            isrResources.sqsQueue,
            `SQS queue for async revalidation should be provisioned. ` +
              `This handles background page regeneration without blocking requests.`,
          );

          process.stderr.write(
            `revalidateTag infrastructure verified: DynamoDB=${isrResources.dynamoTable}, SQS=${isrResources.sqsQueue}\n`,
          );
        });

        void it('stage 5: image optimization — /_next/image returns WebP', async () => {
          // Request image optimization endpoint with standard Next.js params
          const imageUrl = `${distributionUrl}/_next/image?url=%2Frobots.txt&w=640&q=75`;
          process.stderr.write(
            `Requesting image optimization: ${imageUrl}\n`,
          );

          const imageResponse = await fetchWithRetry(imageUrl, {
            expectedStatus: 200,
            maxRetries: 8,
            intervalMs: 15000,
          });

          assert.strictEqual(
            imageResponse.status,
            200,
            `Expected HTTP 200 from image optimization endpoint, got ${imageResponse.status}`,
          );

          // Verify Content-Type is image/webp
          const contentType =
            imageResponse.headers.get('content-type') ?? '';
          assert.ok(
            contentType.includes('image/webp'),
            `Image optimization response should be image/webp, got: ${contentType}`,
          );

          // Verify non-empty response body
          const imageBuffer = await imageResponse.arrayBuffer();
          assert.ok(
            imageBuffer.byteLength > 0,
            `Image response should not be empty, got ${imageBuffer.byteLength} bytes`,
          );

          // Verify cache headers (optimized images should be aggressively cached)
          const cacheControl =
            imageResponse.headers.get('cache-control') ?? '';
          assert.ok(
            cacheControl.includes('max-age'),
            `Image response should have cache-control with max-age, got: ${cacheControl}`,
          );

          process.stderr.write(
            `Image optimization verified: content-type=${contentType}, size=${imageBuffer.byteLength}B\n`,
          );
        });

        void it('stage 6: verifies multiple Lambda functions (server + image-optimization)', async () => {
          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);
          const lambdaFunctions = await findAllLambdaFunctions(
            cfnClient,
            frontendStackName,
          );

          process.stderr.write(
            `Lambda functions: ${JSON.stringify(lambdaFunctions)}\n`,
          );

          // Should have at least 2: server function + image optimization
          assert.ok(
            lambdaFunctions.length >= 2,
            `Should have at least 2 Lambda functions (server + image-optimization), found ${lambdaFunctions.length}: ${JSON.stringify(lambdaFunctions)}`,
          );
        });

        void it('stage 7: applies v2 changes and full deploys — validates v2 content and infra change', async () => {
          // Apply combined v2 update (server content change + memorySize infra change)
          const updates = await testProject.getUpdates();
          const v2Update = updates[0];
          for (const replacement of v2Update.replacements) {
            await fsp.cp(replacement.source, replacement.destination, {
              force: true,
            });
          }

          // Copy amplify_outputs.json into the v2 server function bundle
          const outputsPath = path.join(
            testProject.projectDirPath,
            'amplify_outputs.json',
          );
          const serverFnDir = path.join(
            testProject.projectDirPath,
            '.open-next',
            'server-function',
          );
          await fsp.cp(
            outputsPath,
            path.join(serverFnDir, 'amplify_outputs.json'),
          );

          // Full deploy (no --backend / --frontend flag) to update everything
          await testProject.deploy(fullIdentifier);

          // Verify v2 SSR content is served with backend data
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

          // Verify backend connectivity is still working after full deploy
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
            `SVG should still be accessible after full deploy, got ${svgResponse.status}`,
          );

          // Verify infra change: Lambda memory should be 512 MB
          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);

          let ssrFunctionName: string | undefined;
          try {
            ssrFunctionName = await findLambdaFunctionName(
              cfnClient,
              frontendStackName,
            );
          } catch {
            // If frontend stack was superseded by full deploy, check the full stack
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

          // Verify content still works after memory change
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
 * Find ISR-related resources (S3 cache bucket, DynamoDB table, SQS queue).
 */
const findIsrResources = async (
  cfnClient: CloudFormationClient,
  stackName: string,
): Promise<{
  cacheBucket: string | undefined;
  dynamoTable: string | undefined;
  sqsQueue: string | undefined;
}> => {
  const result = {
    cacheBucket: undefined as string | undefined,
    dynamoTable: undefined as string | undefined,
    sqsQueue: undefined as string | undefined,
  };

  const scanStack = async (name: string, depth: number) => {
    if (depth > 3) return;

    const resources = await cfnClient.send(
      new ListStackResourcesCommand({ StackName: name }),
    );

    for (const r of resources.StackResourceSummaries ?? []) {
      if (
        r.ResourceType === 'AWS::S3::Bucket' &&
        (r.LogicalResourceId?.toLowerCase().includes('cache') ||
          r.LogicalResourceId?.toLowerCase().includes('isr'))
      ) {
        result.cacheBucket = r.PhysicalResourceId!;
      }

      if (
        r.ResourceType === 'AWS::DynamoDB::Table' &&
        (r.LogicalResourceId?.toLowerCase().includes('tag') ||
          r.LogicalResourceId?.toLowerCase().includes('revalidat'))
      ) {
        result.dynamoTable = r.PhysicalResourceId!;
      }

      if (
        r.ResourceType === 'AWS::SQS::Queue' &&
        (r.LogicalResourceId?.toLowerCase().includes('revalidat') ||
          r.LogicalResourceId?.toLowerCase().includes('isr'))
      ) {
        result.sqsQueue = r.PhysicalResourceId!;
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
  return result;
};

/**
 * Find all Lambda function logical resource IDs in a stack (excluding internal CDK resources).
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
            nr.LogicalResourceId?.includes('Server') ||
            nr.LogicalResourceId?.includes('Default') ||
            nr.LogicalResourceId?.includes('default')
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
                dr.LogicalResourceId?.includes('Server') ||
                dr.LogicalResourceId?.includes('Default') ||
                dr.LogicalResourceId?.includes('default')
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

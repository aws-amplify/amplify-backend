import {
  TestCdkProjectCreator,
  testCdkProjectsSourceRoot,
} from './test_cdk_project_creator.js';
import { TestCdkProjectBase } from './test_cdk_project_base.js';
import { createEmptyCdkProject } from './create_empty_cdk_project.js';
import fs from 'fs/promises';
import path from 'path';
import assert from 'node:assert';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  ListStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import {
  fetchWithRetry,
  getDistributionUrlFromStack,
} from '../../hosting_test_support.js';

/**
 * Creates a CDK project that uses AmplifyHostingConstruct directly for SSR hosting.
 * Validates the construct works as a standalone L3 without defineHosting/ampx.
 */
export class HostingConstructSsrTestCdkProjectCreator
  implements TestCdkProjectCreator
{
  readonly name = 'hosting-construct-ssr';

  createProject = async (
    e2eProjectDir: string,
  ): Promise<TestCdkProjectBase> => {
    const { projectName, projectRoot } = await createEmptyCdkProject(
      this.name,
      e2eProjectDir,
    );

    // Copy CDK stack source to lib/
    const sourceProjectDirPath = path.resolve(
      testCdkProjectsSourceRoot,
      this.name,
    );
    await fs.cp(sourceProjectDirPath, path.join(projectRoot, 'lib'), {
      recursive: true,
    });

    // Create .next/ build output fixture (simulates `next build --output standalone`)
    const standaloneDir = path.join(projectRoot, '.next', 'standalone');
    await fs.mkdir(standaloneDir, { recursive: true });

    // Minimal mock server.js — serves SSR content over HTTP for Lambda Web Adapter
    await fs.writeFile(
      path.join(standaloneDir, 'server.js'),
      `const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body><h1>Hello Construct SSR</h1><p>Server-rendered by Lambda via AmplifyHostingConstruct.</p></body></html>');
});

server.listen(PORT, '0.0.0.0', () => {
  process.stderr.write('Server running on port ' + PORT + '\\n');
});
`,
    );

    await fs.writeFile(
      path.join(standaloneDir, 'package.json'),
      JSON.stringify({ name: 'standalone', private: true }, null, 2),
    );

    // Create .next/static/ directory with mock assets
    const staticDir = path.join(projectRoot, '.next', 'static');
    const chunksDir = path.join(staticDir, 'chunks');
    await fs.mkdir(chunksDir, { recursive: true });

    await fs.writeFile(
      path.join(staticDir, 'buildManifest.json'),
      JSON.stringify({}),
    );
    await fs.writeFile(
      path.join(chunksDir, 'main-abc123.js'),
      '// Mock static chunk\n',
    );

    // Create public/ directory with test assets
    const publicDir = path.join(projectRoot, 'public');
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(
      path.join(publicDir, 'robots.txt'),
      'User-agent: *\nDisallow:\n',
    );

    // Create next.config.js (required by nextjs adapter pre-flight check)
    await fs.writeFile(
      path.join(projectRoot, 'next.config.js'),
      `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

module.exports = nextConfig;
`,
    );

    return new HostingConstructSsrTestCdkProject(projectName, projectRoot);
  };
}

class HostingConstructSsrTestCdkProject extends TestCdkProjectBase {
  private readonly cfnClient = new CloudFormationClient(
    e2eToolingClientConfig,
  );

  assertPostDeployment = async (): Promise<void> => {
    // Retrieve the CloudFront distribution URL from stack outputs
    const distributionUrl = await getDistributionUrlFromStack(
      this.cfnClient,
      this.stackName,
    );
    assert.ok(
      distributionUrl.startsWith('https://'),
      `DistributionUrl should start with https://, got: ${distributionUrl}`,
    );
    process.stderr.write(
      `CloudFront URL (construct SSR): ${distributionUrl}\n`,
    );

    // Verify SSR content via HTTP with retry for CloudFront + Lambda propagation
    const response = await fetchWithRetry(distributionUrl, {
      expectedBodyContains: 'Hello Construct SSR',
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
      body.includes('Hello Construct SSR'),
      `Response body should contain "Hello Construct SSR" (proves Lambda runs), got: ${body.substring(0, 200)}`,
    );

    // Verify static asset (/_next/static/) is accessible via CloudFront
    const staticResponse = await fetchWithRetry(
      `${distributionUrl}/_next/static/buildManifest.json`,
      {
        expectedStatus: 200,
        maxRetries: 3,
        intervalMs: 5000,
      },
    );
    assert.strictEqual(
      staticResponse.status,
      200,
      `Expected HTTP 200 for static asset, got ${staticResponse.status}`,
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

    // Verify stack has Lambda resources (proves SSR path was created)
    const hasLambda = await this.stackHasLambdaFunction();
    assert.ok(
      hasLambda,
      'SSR stack should contain at least one Lambda function',
    );

    // Verify stack deployed successfully
    const describeResult = await this.cfnClient.send(
      new DescribeStacksCommand({ StackName: this.stackName }),
    );
    const stack = describeResult.Stacks?.[0];
    assert.ok(
      stack?.StackStatus === 'CREATE_COMPLETE' ||
        stack?.StackStatus === 'UPDATE_COMPLETE',
      `Stack should be in a successful state, got: ${stack?.StackStatus}`,
    );
  };

  /**
   * Check if the stack (including nested stacks) contains a Lambda function.
   */
  private stackHasLambdaFunction = async (): Promise<boolean> => {
    const rootResources = await this.cfnClient.send(
      new ListStackResourcesCommand({ StackName: this.stackName }),
    );

    for (const r of rootResources.StackResourceSummaries ?? []) {
      if (r.ResourceType === 'AWS::Lambda::Function') {
        return true;
      }
      if (
        r.ResourceType === 'AWS::CloudFormation::Stack' &&
        r.PhysicalResourceId
      ) {
        const nestedResources = await this.cfnClient.send(
          new ListStackResourcesCommand({
            StackName: r.PhysicalResourceId,
          }),
        );
        for (const nr of nestedResources.StackResourceSummaries ?? []) {
          if (nr.ResourceType === 'AWS::Lambda::Function') {
            return true;
          }
          // Check second-level nested stacks
          if (
            nr.ResourceType === 'AWS::CloudFormation::Stack' &&
            nr.PhysicalResourceId
          ) {
            const deepResources = await this.cfnClient.send(
              new ListStackResourcesCommand({
                StackName: nr.PhysicalResourceId,
              }),
            );
            for (const dr of deepResources.StackResourceSummaries ?? []) {
              if (dr.ResourceType === 'AWS::Lambda::Function') {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  };
}

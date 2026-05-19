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

const SSR_CONTENT_MARKER = 'Hello Vanilla CDK SSR';

/**
 * Creates a vanilla CDK project that uses AmplifyHostingConstruct for SSR hosting.
 * Validates the construct works in a pure CDK app — no Amplify CLI, no defineHosting().
 */
export class VanillaCdkSsrTestCdkProjectCreator implements TestCdkProjectCreator {
  readonly name = 'vanilla-cdk-ssr';

  createProject = async (
    e2eProjectDir: string,
  ): Promise<TestCdkProjectBase> => {
    const { projectName, projectRoot } = await createEmptyCdkProject(
      this.name,
      e2eProjectDir,
    );

    // Override the CDK-generated package.json build script.
    // `cdk init` sets "build": "tsc" which is wrong for a Next.js project —
    // the hosting adapter calls `npm run build` expecting `next build`.
    const pkgJsonPath = path.join(projectRoot, 'package.json');
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));
    pkgJson.scripts = { ...pkgJson.scripts, build: 'next build' };
    pkgJson.dependencies = {
      ...pkgJson.dependencies,
      next: '15.5.15',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    };
    pkgJson.devDependencies = {
      ...pkgJson.devDependencies,
      '@opennextjs/aws': '^3.10.0',
      tsx: '^4.0.0',
    };
    await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

    // Patch cdk.json to use `tsx` instead of `ts-node`.
    // CDK init generates: "app": "npx ts-node --prefer-ts-exts bin/xxx.ts"
    // ts-node in CJS mode cannot handle ESM imports used by our stack.
    const cdkJsonPath = path.join(projectRoot, 'cdk.json');
    const cdkJson = JSON.parse(await fs.readFile(cdkJsonPath, 'utf-8'));
    cdkJson.app = cdkJson.app.replace(
      /npx ts-node --prefer-ts-exts/,
      'npx tsx',
    );
    await fs.writeFile(cdkJsonPath, JSON.stringify(cdkJson, null, 2));

    // Copy CDK stack source to lib/
    const sourceProjectDirPath = path.resolve(
      testCdkProjectsSourceRoot,
      this.name,
    );
    await fs.cp(sourceProjectDirPath, path.join(projectRoot, 'lib'), {
      recursive: true,
    });

    // Move app/ directory from lib/ to project root so Next.js can find it.
    // The source dir contains both CDK stack files (belong in lib/) and Next.js
    // app directory (must be at the project root for `next build` to work).
    const libAppDir = path.join(projectRoot, 'lib', 'app');
    const rootAppDir = path.join(projectRoot, 'app');
    await fs.cp(libAppDir, rootAppDir, { recursive: true });
    await fs.rm(libAppDir, { recursive: true });

    // Update tsconfig.json to support JSX (needed for app/*.tsx files).
    // CDK init creates a tsconfig without JSX support.
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf-8'));
    tsconfig.compilerOptions = {
      ...tsconfig.compilerOptions,
      jsx: 'preserve',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      noEmit: true,
      incremental: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
    };
    tsconfig.include = ['**/*.ts', '**/*.tsx', 'next-env.d.ts'];
    tsconfig.exclude = ['node_modules', '.next', '.open-next'];
    await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));

    // Create .open-next/ build output fixture (simulates OpenNext build output)
    const openNextDir = path.join(projectRoot, '.open-next');
    const serverFnDir = path.join(openNextDir, 'server-function');
    await fs.mkdir(serverFnDir, { recursive: true });

    // OpenNext output manifest
    await fs.writeFile(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify(
        {
          origins: {
            default: {
              type: 'function',
              handler: 'index.handler',
              streaming: true,
              runtime: 'nodejs20.x',
            },
            s3: { type: 's3' },
          },
          behaviors: [
            { pattern: '/_next/static/*', origin: 's3' },
            { pattern: '/*', origin: 'default' },
          ],
          additionalProps: {
            disableIncrementalCache: true,
            imageOptimization: false,
          },
        },
        null,
        2,
      ),
    );

    // Lambda handler that serves SSR content
    await fs.writeFile(
      path.join(serverFnDir, 'index.js'),
      `exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'content-type': 'text/html' },
    body: '<html><body><h1>${SSR_CONTENT_MARKER}</h1><p>Server-rendered by Lambda via AmplifyHostingConstruct in a vanilla CDK app.</p></body></html>',
    isBase64Encoded: false,
  };
};
`,
    );

    // Create .open-next/assets/ directory with static files
    const assetsDir = path.join(openNextDir, 'assets', '_next', 'static');
    await fs.mkdir(assetsDir, { recursive: true });

    await fs.writeFile(
      path.join(assetsDir, 'buildManifest.json'),
      JSON.stringify({}),
    );

    const chunksDir = path.join(assetsDir, 'chunks');
    await fs.mkdir(chunksDir, { recursive: true });
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

    // Create next.config.js
    await fs.writeFile(
      path.join(projectRoot, 'next.config.js'),
      `/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
`,
    );

    return new VanillaCdkSsrTestCdkProject(projectName, projectRoot);
  };
}

class VanillaCdkSsrTestCdkProject extends TestCdkProjectBase {
  private readonly cfnClient = new CloudFormationClient(e2eToolingClientConfig);

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
      `CloudFront URL (vanilla CDK SSR): ${distributionUrl}\n`,
    );

    // Verify SSR content via HTTP with retry for CloudFront + Lambda propagation
    const response = await fetchWithRetry(distributionUrl, {
      expectedBodyContains: SSR_CONTENT_MARKER,
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
      body.includes(SSR_CONTENT_MARKER),
      `Response body should contain "${SSR_CONTENT_MARKER}" (proves Lambda runs), got: ${body.substring(0, 200)}`,
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
    assert.ok(csp, 'Response should include content-security-policy header');
    assert.ok(
      csp!.includes('wss:'),
      `content-security-policy connect-src should include wss:, got: ${csp}`,
    );

    // Verify stack has Lambda resources (proves SSR compute path was created)
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

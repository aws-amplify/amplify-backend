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
} from '@aws-sdk/client-cloudformation';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import {
  fetchWithRetry,
  getDistributionUrlFromStack,
} from '../../hosting_test_support.js';

const SPA_CONTENT_MARKER = 'Hello Vanilla CDK SPA';

/**
 * Creates a vanilla CDK project that uses AmplifyHostingConstruct for SPA hosting.
 * Validates the construct works in a pure CDK app — no Amplify CLI, no defineHosting().
 */
export class VanillaCdkSpaTestCdkProjectCreator
  implements TestCdkProjectCreator
{
  readonly name = 'vanilla-cdk-spa';

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

    // Create static-site/ with test content
    const staticSiteDir = path.join(projectRoot, 'static-site');
    await fs.mkdir(staticSiteDir, { recursive: true });
    await fs.writeFile(
      path.join(staticSiteDir, 'index.html'),
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vanilla CDK SPA E2E Test</title>
  </head>
  <body>
    <h1>${SPA_CONTENT_MARKER}</h1>
    <p>Deployed via AmplifyHostingConstruct in a vanilla CDK app.</p>
  </body>
</html>`,
    );

    return new VanillaCdkSpaTestCdkProject(projectName, projectRoot);
  };
}

class VanillaCdkSpaTestCdkProject extends TestCdkProjectBase {
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
      `CloudFront URL (vanilla CDK SPA): ${distributionUrl}\n`,
    );

    // Verify SPA content via HTTP with retry for CloudFront propagation
    const response = await fetchWithRetry(distributionUrl, {
      expectedBodyContains: SPA_CONTENT_MARKER,
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
      body.includes(SPA_CONTENT_MARKER),
      `Response body should contain "${SPA_CONTENT_MARKER}", got: ${body.substring(0, 200)}`,
    );

    // Verify SPA fallback: a nonexistent route should return index.html (200)
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
      fallbackBody.includes(SPA_CONTENT_MARKER),
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
    assert.ok(csp, 'Response should include content-security-policy header');
    assert.ok(
      csp!.includes('wss:'),
      `content-security-policy connect-src should include wss:, got: ${csp}`,
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
}

/**
 * E2E test: Middleware Lambda@Edge redirect.
 *
 * This test deploys a CDK stack with a hosting construct that includes
 * middleware (Lambda@Edge). The middleware redirects /protected → /login
 * when no auth-token cookie is present.
 *
 * Verification:
 * 1. Request /protected WITHOUT cookie → 302 redirect to /login
 * 2. The redirect happens at the CDN level (Lambda@Edge), NOT the origin
 *    - Verified by checking for X-Middleware-Redirect header
 *    - Verified by checking that the origin Lambda is NOT invoked (no x-amzn-requestid)
 * 3. Request /protected WITH auth-token cookie → 200 (passes through to origin)
 *
 * Prerequisites:
 * - AWS credentials configured with deploy permissions
 * - Set HOSTING_MIDDLEWARE_E2E_STACK_NAME env var to a deployed stack name,
 *   OR set HOSTING_MIDDLEWARE_E2E_DISTRIBUTION_URL directly to skip stack lookup.
 *
 * To run:
 *   HOSTING_MIDDLEWARE_E2E_DISTRIBUTION_URL=https://dxxx.cloudfront.net \
 *     node --test packages/integration-tests/lib/test-e2e/hosting_middleware.test.js
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import {
  fetchWithRetry,
  getDistributionUrlFromStack,
} from '../hosting_test_support.js';

let distributionUrl: string;

void describe('Hosting middleware e2e — Lambda@Edge redirect', () => {
  before(async () => {
    // Get the distribution URL from env or stack lookup
    if (process.env.HOSTING_MIDDLEWARE_E2E_DISTRIBUTION_URL) {
      distributionUrl = process.env.HOSTING_MIDDLEWARE_E2E_DISTRIBUTION_URL;
    } else {
      const stackName =
        process.env.HOSTING_MIDDLEWARE_E2E_STACK_NAME ??
        'HostingMiddlewareE2eStack';
      const cfnClient = new CloudFormationClient(e2eToolingClientConfig);
      distributionUrl = await getDistributionUrlFromStack(cfnClient, stackName);
    }

    assert.ok(
      distributionUrl,
      'Distribution URL must be available (set HOSTING_MIDDLEWARE_E2E_DISTRIBUTION_URL or deploy the stack first)',
    );
    process.stderr.write(
      `Testing middleware redirect on: ${distributionUrl}\n`,
    );
  });

  void it('redirects /protected to /login when no auth cookie (CDN-level redirect)', async () => {
    const url = `${distributionUrl}/protected`;

    // Make request WITHOUT following redirects so we can inspect the 302
    const response = await fetch(url, { redirect: 'manual' });

    // Verify we get a redirect (302)
    assert.strictEqual(
      response.status,
      302,
      `Expected 302 redirect from /protected without cookie, got ${response.status}`,
    );

    // Verify the Location header points to /login
    const location = response.headers.get('location');
    assert.ok(
      location && location.includes('/login'),
      `Expected Location header to contain /login, got: ${location}`,
    );

    // Verify the redirect came from Lambda@Edge (CDN level), not the origin
    // Lambda@Edge sets the custom X-Middleware-Redirect header
    const middlewareHeader = response.headers.get('x-middleware-redirect');
    assert.strictEqual(
      middlewareHeader,
      'true',
      'Expected X-Middleware-Redirect: true header proving redirect is from Lambda@Edge, not origin',
    );

    // eslint-disable-next-line spellcheck/spell-checker
    // The response should NOT have x-amzn-requestid (which indicates origin invocation)
    // eslint-disable-next-line spellcheck/spell-checker
    const originRequestId = response.headers.get('x-amzn-requestid');
    assert.strictEqual(
      originRequestId,
      null,
      // eslint-disable-next-line spellcheck/spell-checker
      'Should NOT have x-amzn-requestid header (redirect should happen at edge, not origin)',
    );
  });

  void it('passes through to origin when auth-token cookie is present', async () => {
    const url = `${distributionUrl}/protected`;

    // Make request WITH auth-token cookie
    const response = await fetchWithRetry(url, {
      maxRetries: 5,
      intervalMs: 10000,
      expectedStatus: 200,
      expectedBodyContains: 'Protected Content',
      fetchInit: {
        headers: {
          cookie: 'auth-token=valid-session-token',
        },
      },
    });

    assert.strictEqual(
      response.status,
      200,
      `Expected 200 from /protected with auth cookie, got ${response.status}`,
    );

    const body = await response.text();
    assert.ok(
      body.includes('Protected Content'),
      'Expected origin to serve protected content when auth cookie is present',
    );
  });

  void it('does not redirect non-protected paths', async () => {
    const url = `${distributionUrl}/`;

    const response = await fetchWithRetry(url, {
      maxRetries: 5,
      intervalMs: 10000,
      expectedStatus: 200,
    });

    assert.strictEqual(
      response.status,
      200,
      `Expected 200 from root path, got ${response.status}`,
    );
  });
});

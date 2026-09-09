import { after, before, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { StandaloneHostingAstroTestProjectCreator } from '../../test-project-setup/standalone_hosting_astro.js';
import { TestProjectBase } from '../../test-project-setup/test_project_base.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { shortUuid } from '../../short_uuid.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import {
  fetchWithRetry,
  getDistributionUrlFromStack,
} from '../../hosting_test_support.js';

const testProjectCreator = new StandaloneHostingAstroTestProjectCreator();

void describe(
  'standalone hosting Astro SSR deployment tests',
  { concurrency: false, timeout: 1800000 },
  () => {
    const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('standalone deploys hosting-astro', () => {
      let testProject: TestProjectBase;
      const namespace = `astro-e2e-${shortUuid()}`;
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

      after(async () => {
        // Fire-and-forget: CloudFront takes 15-30 min to delete and the
        // stack-deletion completes after the process exits.
        for (const id of [frontendIdentifier, backendIdentifier]) {
          try {
            await testProject.tearDown(id);
          } catch {
            process.stderr.write(
              `⚠️ Failed to initiate stack deletion for ${id.name}.\n`,
            );
          }
        }
      });

      void describe('in sequence', { concurrency: false }, () => {
        void it('stage 1: deploys backend (auth + data + storage)', async () => {
          await testProject.deploy(backendIdentifier);
          const stackName =
            BackendIdentifierConversions.toStackName(backendIdentifier);
          process.stderr.write(`Backend stack deployed: ${stackName}\n`);
        });

        void it('stage 2: deploys Astro frontend and serves SSR + prerendered + API', async () => {
          await testProject.deploy(frontendIdentifier);

          const frontendStackName =
            BackendIdentifierConversions.toStackName(frontendIdentifier);
          distributionUrl = await getDistributionUrlFromStack(
            cfnClient,
            frontendStackName,
          );
          assert.ok(
            distributionUrl.startsWith('https://'),
            `DistributionUrl should start with https://, got: ${distributionUrl}`,
          );
          process.stderr.write(`CloudFront URL: ${distributionUrl}\n`);

          // SSR home page
          const homeRes = await fetchWithRetry(distributionUrl, {
            expectedStatus: 200,
            expectedBodyContains: 'Astro hosting smoke test',
            maxRetries: 10,
            intervalMs: 30000,
          });
          assert.strictEqual(homeRes.status, 200);
          assert.ok(
            (homeRes.headers.get('content-type') ?? '').includes('text/html'),
            'home page must be HTML',
          );

          // Prerendered route
          const aboutRes = await fetchWithRetry(`${distributionUrl}/about`, {
            expectedStatus: 200,
            expectedBodyContains: 'statically prerendered',
            maxRetries: 5,
            intervalMs: 10000,
          });
          assert.strictEqual(aboutRes.status, 200);

          // API GET
          const healthRes = await fetchWithRetry(
            `${distributionUrl}/api/health`,
            {
              expectedStatus: 200,
              maxRetries: 5,
              intervalMs: 10000,
            },
          );
          assert.strictEqual(healthRes.status, 200);
          const healthBody = (await healthRes.json()) as { status?: string };
          assert.strictEqual(healthBody.status, 'ok');

          // API POST
          const echoRes = await fetch(`${distributionUrl}/api/echo`, {
            method: 'POST',
            headers: { 'content-type': 'text/plain' },
            body: 'ping',
          });
          assert.strictEqual(echoRes.status, 200);
          const echoBody = (await echoRes.json()) as {
            echoed?: string;
            length?: number;
          };
          assert.strictEqual(echoBody.echoed, 'ping');
          assert.strictEqual(echoBody.length, 4);

          // Middleware header lift
          assert.strictEqual(
            homeRes.headers.get('x-amplify-astro-test'),
            '1',
            'middleware should add x-amplify-astro-test: 1',
          );

          // Security headers (B14/B23)
          assert.ok(
            homeRes.headers.get('strict-transport-security'),
            'strict-transport-security required',
          );
          assert.strictEqual(
            homeRes.headers.get('x-content-type-options'),
            'nosniff',
          );

          // 404 path
          const notFoundRes = await fetchWithRetry(
            `${distributionUrl}/this-path-should-not-exist-xyz`,
            {
              expectedStatus: 404,
              maxRetries: 5,
              intervalMs: 10000,
            },
          );
          assert.strictEqual(notFoundRes.status, 404);

          await testProject.assertPostDeployment(backendIdentifier);
        });
      });
    });
  },
);

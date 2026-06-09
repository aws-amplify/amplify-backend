import { after, before, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { StandaloneHostingAstroBasepathTestProjectCreator } from '../../test-project-setup/standalone_hosting_astro_basepath.js';
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

const testProjectCreator =
  new StandaloneHostingAstroBasepathTestProjectCreator();

void describe(
  'standalone hosting Astro SSR (basePath + trailingSlash) deployment tests',
  { concurrency: false, timeout: 1800000 },
  () => {
    const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('standalone deploys hosting-astro-basepath', () => {
      let testProject: TestProjectBase;
      const namespace = `astro-bp-e2e-${shortUuid()}`;
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

        void it('stage 2: deploys Astro frontend with basePath=/app', async () => {
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

          // Initial reachability probe: with basePath + trailingSlash,
          // /app/ is the canonical home — wait for CloudFront propagation
          // before running the assertion stages.
          await fetchWithRetry(`${distributionUrl}/app/`, {
            expectedStatus: 200,
            expectedBodyContains: 'Astro hosting smoke test',
            maxRetries: 10,
            intervalMs: 30000,
          });

          await testProject.assertPostDeployment(backendIdentifier);
        });

        // ---- G1: manifest.basePath end-to-end ----

        void it('basePath: bare / 308-redirects to /app/', async () => {
          const res = await fetch(distributionUrl, { redirect: 'manual' });
          assert.strictEqual(res.status, 308);
          assert.strictEqual(res.headers.get('location'), '/app/');
        });

        void it('basePath: /app/ serves the home page', async () => {
          await fetchWithRetry(`${distributionUrl}/app/`, {
            expectedStatus: 200,
            expectedBodyContains: '/app/about',
          });
        });

        void it('basePath: /app/about renders the about page', async () => {
          await fetchWithRetry(`${distributionUrl}/app/about/`, {
            expectedStatus: 200,
          });
        });

        void it('basePath: bare /about returns 404 (no behavior matches)', async () => {
          const res = await fetch(`${distributionUrl}/about`, {
            redirect: 'manual',
          });
          assert.ok(
            res.status === 404 || res.status === 308,
            `bare /about must not serve content (got ${res.status})`,
          );
        });

        void it('basePath: /app/logo.svg resolves to S3', async () => {
          const res = await fetchWithRetry(`${distributionUrl}/app/logo.svg`, {
            expectedStatus: 200,
          });
          assert.match(res.headers.get('content-type') ?? '', /image|svg/);
        });

        // ---- G2: trailing-slash canonical redirects ----

        void it('trailingSlash always: /app/about 308-redirects to /app/about/', async () => {
          const res = await fetch(`${distributionUrl}/app/about`, {
            redirect: 'manual',
          });
          assert.strictEqual(res.status, 308);
          assert.strictEqual(res.headers.get('location'), '/app/about/');
        });

        void it('trailingSlash always: /app/about/ serves directly', async () => {
          const res = await fetchWithRetry(`${distributionUrl}/app/about/`, {
            fetchInit: { redirect: 'manual' },
            expectedStatus: 200,
            maxRetries: 5,
            intervalMs: 10000,
          });
          assert.strictEqual(res.status, 200);
        });

        void it('trailingSlash always: no infinite loop on /app/', async () => {
          const res = await fetchWithRetry(`${distributionUrl}/app/`, {
            fetchInit: { redirect: 'manual' },
            expectedStatus: 200,
            maxRetries: 5,
            intervalMs: 10000,
          });
          assert.strictEqual(res.status, 200, '/app/ must serve, not redirect');
        });
      });
    });
  },
);

import { after, before, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { StandaloneHostingSsrMonorepoTestProjectCreator } from '../../test-project-setup/standalone_hosting_ssr_monorepo.js';
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

const testProjectCreator = new StandaloneHostingSsrMonorepoTestProjectCreator();

void describe(
  'standalone hosting Next.js SSR (monorepo) deployment tests',
  { concurrency: false, timeout: 1800000 },
  () => {
    const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('standalone deploys hosting-ssr-monorepo', () => {
      let testProject: TestProjectBase;
      const namespace = `ssr-mono-e2e-${shortUuid()}`;
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

        void it('monorepo standalone: deploys + serves SSR home page', async () => {
          // The deployment success itself is the load-bearing assertion —
          // if nextjs.ts:resolveStandaloneServerPath regresses, the deploy
          // fails before this fetch even runs.
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

          const res = await fetchWithRetry(distributionUrl, {
            expectedStatus: 200,
            expectedBodyContains: '<html',
            maxRetries: 10,
            intervalMs: 30000,
          });
          assert.match(res.headers.get('content-type') ?? '', /text\/html/);
        });
      });
    });
  },
);

import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { testConcurrencyLevel } from '../test_concurrency.js';
import { TestCdkProjectBase } from '../../test-project-setup/cdk/test_cdk_project_base.js';
import { VanillaCdkSsrTestCdkProjectCreator } from '../../test-project-setup/cdk/vanilla_cdk_ssr.js';

/**
 * E2E deployment test for AmplifyHostingConstruct SSR hosting in a vanilla CDK app.
 *
 * 1. Scaffolds a CDK project with the SSR hosting stack
 * 2. Deploys via `cdk deploy` (not `ampx deploy`)
 * 3. Verifies CloudFront serves server-rendered content ("Hello Vanilla CDK SSR")
 * 4. Verifies static assets (/_next/static/) are accessible
 * 5. Verifies security headers (CSP with wss:, HSTS, X-Frame-Options, X-Content-Type-Options)
 * 6. Verifies the stack contains Lambda resources
 * 7. Tears down via `cdk destroy`
 */

const testCdkProjectCreator = new VanillaCdkSsrTestCdkProjectCreator();

void describe(
  'vanilla CDK hosting SSR deployment test',
  { concurrency: testConcurrencyLevel },
  () => {
    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe(`${testCdkProjectCreator.name}`, () => {
      let testCdkProject: TestCdkProjectBase;

      beforeEach(async () => {
        testCdkProject = await testCdkProjectCreator.createProject(rootTestDir);
      });

      afterEach(async () => {
        await testCdkProject.tearDown();
      });

      void it('deploys and serves content with security headers', async () => {
        await testCdkProject.deploy();
        await testCdkProject.assertPostDeployment();
      });
    });
  },
);

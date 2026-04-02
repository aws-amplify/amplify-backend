import { HostingConstructSsrTestCdkProjectCreator } from '../../test-project-setup/cdk/hosting_construct_ssr.js';
import { defineCdkDeploymentTest } from './cdk.deployment.test.template.js';

/**
 * E2E deployment test for AmplifyHostingConstruct used directly as a CDK L3 (SSR).
 *
 * This test proves the construct works without defineHosting() or the Amplify CLI:
 * 1. Scaffolds a CDK project with the SSR hosting stack
 * 2. Deploys via `cdk deploy` (not `ampx deploy`)
 * 3. Verifies CloudFront serves server-rendered content (Lambda invoked)
 * 4. Verifies static assets (/_next/static/) are accessible
 * 5. Verifies security headers (CSP, HSTS, X-Frame-Options)
 * 6. Verifies the stack contains Lambda resources
 * 7. Tears down via `cdk destroy`
 */
defineCdkDeploymentTest(new HostingConstructSsrTestCdkProjectCreator());

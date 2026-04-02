import { HostingConstructSpaTestCdkProjectCreator } from '../../test-project-setup/cdk/hosting_construct_spa.js';
import { defineCdkDeploymentTest } from './cdk.deployment.test.template.js';

/**
 * E2E deployment test for AmplifyHostingConstruct used directly as a CDK L3 (SPA).
 *
 * This test proves the construct works without defineHosting() or the Amplify CLI:
 * 1. Scaffolds a CDK project with the SPA hosting stack
 * 2. Deploys via `cdk deploy` (not `ampx deploy`)
 * 3. Verifies CloudFront serves the SPA content
 * 4. Verifies SPA routing fallback (404 → index.html)
 * 5. Verifies security headers (CSP, HSTS, X-Frame-Options)
 * 6. Tears down via `cdk destroy`
 */
defineCdkDeploymentTest(new HostingConstructSpaTestCdkProjectCreator());

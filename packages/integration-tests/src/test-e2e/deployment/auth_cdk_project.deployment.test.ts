import { defineCdkDeploymentTest } from './cdk.deployment.test.template.js';
import { AuthTestCdkProjectCreator } from '../../test-project-setup/cdk/auth_cdk_project.js';

defineCdkDeploymentTest(new AuthTestCdkProjectCreator());

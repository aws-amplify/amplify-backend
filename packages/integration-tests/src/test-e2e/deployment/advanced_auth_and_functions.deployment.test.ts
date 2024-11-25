import { defineDeploymentTest } from './deployment.test.template.js';
import { AdvancedAuthAndFunctionsTestProjectCreator } from '../../test-project-setup/advanced_auth_and_functions.js';

defineDeploymentTest(new AdvancedAuthAndFunctionsTestProjectCreator());

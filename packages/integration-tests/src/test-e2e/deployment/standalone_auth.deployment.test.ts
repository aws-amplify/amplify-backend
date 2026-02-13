import { StandaloneAuthTestProjectCreator } from '../../test-project-setup/standalone_auth.js';
import { defineStandaloneDeploymentTest } from './standalone_deployment.test.template.js';

defineStandaloneDeploymentTest(new StandaloneAuthTestProjectCreator());

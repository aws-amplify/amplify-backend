import { StandaloneAuthTestProjectCreator } from '../../test-project-setup/standalone_auth.js';
import { defineStandaloneDeploymentTest } from './standalone_deployment.test.template.js';

// Basic standalone deployment test: deploys a minimal backend via ampx deploy,
// verifies the stack exists, uses the correct identifier, and contains no
// Amplify Hosting resources.
defineStandaloneDeploymentTest(new StandaloneAuthTestProjectCreator());

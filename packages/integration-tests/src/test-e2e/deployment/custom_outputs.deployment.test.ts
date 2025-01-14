import { CustomOutputsTestProjectCreator } from '../../test-project-setup/custom_outputs.js';
import { defineDeploymentTest } from './deployment.test.template.js';

defineDeploymentTest(new CustomOutputsTestProjectCreator());

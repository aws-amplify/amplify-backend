import { ReferenceAuthTestProjectCreator } from '../../test-project-setup/reference_auth_project.js';
import { defineDeploymentTest } from './deployment.test.template.js';

defineDeploymentTest(new ReferenceAuthTestProjectCreator());

import { AccessTestingProjectTestProjectCreator } from '../../test-project-setup/access_testing_project.js';
import { defineDeploymentTest } from './deployment.test.template.js';

defineDeploymentTest(new AccessTestingProjectTestProjectCreator());

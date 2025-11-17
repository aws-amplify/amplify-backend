import { PasswordlessAuthTestProjectCreator } from '../../test-project-setup/passwordless_auth_project.js';
import { defineDeploymentTest } from './deployment.test.template.js';

defineDeploymentTest(new PasswordlessAuthTestProjectCreator());

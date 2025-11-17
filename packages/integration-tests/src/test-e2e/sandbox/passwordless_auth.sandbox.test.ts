import { defineSandboxTest } from './sandbox.test.template.js';
import { PasswordlessAuthTestProjectCreator } from '../../test-project-setup/passwordless_auth_project.js';

defineSandboxTest(new PasswordlessAuthTestProjectCreator());

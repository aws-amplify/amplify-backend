import { ReferenceAuthTestProjectCreator } from '../../test-project-setup/reference_auth_project.js';
import { defineSandboxTest } from './sandbox.test.template.js';

defineSandboxTest(new ReferenceAuthTestProjectCreator());

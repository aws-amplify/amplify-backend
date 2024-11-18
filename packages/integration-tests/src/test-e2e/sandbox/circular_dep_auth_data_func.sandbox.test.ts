import { CircularDepAuthDataFuncTestProjectCreator } from '../../test-project-setup/circular_dep_auth_data_func.js';
import { defineSandboxTest } from './sandbox.test.template.js';

defineSandboxTest(new CircularDepAuthDataFuncTestProjectCreator());

import { CircularDepDataFuncTestProjectCreator } from '../../test-project-setup/circular_dep_data_func.js';
import { defineSandboxTest } from './sandbox.test.template.js';

defineSandboxTest(new CircularDepDataFuncTestProjectCreator());

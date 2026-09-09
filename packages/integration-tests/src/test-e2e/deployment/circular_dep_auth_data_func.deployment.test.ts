import { CircularDepAuthDataFuncTestProjectCreator } from '../../test-project-setup/circular_dep_auth_data_func.js';
import { defineDeploymentTest } from './deployment.test.template.js';

defineDeploymentTest(new CircularDepAuthDataFuncTestProjectCreator());

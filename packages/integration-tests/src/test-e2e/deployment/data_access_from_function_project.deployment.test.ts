import { defineDeploymentTest } from './deployment.test.template.js';
import { DataAccessFromFunctionTestProjectCreator } from '../../test-project-setup/data_access_from_function_project.js';

defineDeploymentTest(new DataAccessFromFunctionTestProjectCreator());

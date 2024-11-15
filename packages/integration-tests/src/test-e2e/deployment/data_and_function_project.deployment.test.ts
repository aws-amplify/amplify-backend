import { defineDeploymentTest } from './deployment.test.template.js';
import { DataAndFunctionTestProjectCreator } from '../../test-project-setup/data_and_function_project.js';

defineDeploymentTest(new DataAndFunctionTestProjectCreator());

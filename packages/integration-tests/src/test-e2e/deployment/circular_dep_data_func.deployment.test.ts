import { CircularDepDataFuncTestProjectCreator } from '../../test-project-setup/circular_dep_data_func.js';
import { defineDeploymentTest } from './deployment.test.template.js';

defineDeploymentTest(new CircularDepDataFuncTestProjectCreator());

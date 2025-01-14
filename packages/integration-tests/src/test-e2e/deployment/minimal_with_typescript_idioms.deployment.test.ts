import { MinimalWithTypescriptIdiomTestProjectCreator } from '../../test-project-setup/minimal_with_typescript_idioms.js';
import { defineDeploymentTest } from './deployment.test.template.js';

defineDeploymentTest(new MinimalWithTypescriptIdiomTestProjectCreator());

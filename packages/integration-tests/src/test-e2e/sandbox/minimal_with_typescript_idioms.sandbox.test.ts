import { defineSandboxTest } from './sandbox.test.template.js';
import { MinimalWithTypescriptIdiomTestProjectCreator } from '../../test-project-setup/minimal_with_typescript_idioms.js';

defineSandboxTest(new MinimalWithTypescriptIdiomTestProjectCreator());

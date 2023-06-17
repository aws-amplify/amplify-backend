import { runTestSuite } from './test_runner.js';
import { fromConventionalDir } from './test_case_config_generator.js';

runTestSuite('integration tests', fromConventionalDir('./test-projects'));

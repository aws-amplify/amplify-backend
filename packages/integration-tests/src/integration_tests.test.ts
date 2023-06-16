import { runTestSuite } from './test_runner.js';
import { fromConventionalDir } from './from_conventional_dir.js';

runTestSuite('integration tests', fromConventionalDir('./test-projects'));

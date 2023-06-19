import { runCDKSnapshotTestSuite } from './test_runner.js';
import { fromConventionalDir } from './test_case_config_generator.js';

runCDKSnapshotTestSuite(
  'CDK snapshot tests',
  fromConventionalDir('./test-projects')
);

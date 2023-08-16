import { runCDKSnapshotTestSuite } from './cdk_snapshot_test_runner.js';
import { fromConventionalDir } from './cdk_snapshot_test_suite_generator.js';

runCDKSnapshotTestSuite(
  'CDK snapshot tests',
  fromConventionalDir('../test-projects').concat(
    fromConventionalDir('../../create-amplify/templates')
  )
);

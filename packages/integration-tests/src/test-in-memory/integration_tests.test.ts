import { runCDKSnapshotTestSuite } from '../cdk_snapshot_test_runner.js';
import { fromConventionalDir } from '../cdk_snapshot_test_suite_generator.js';
import * as path from 'path';

runCDKSnapshotTestSuite(
  'CDK snapshot tests',
  fromConventionalDir(path.join('..', 'test-projects')).concat(
    fromConventionalDir(path.join('..', '..', 'create-amplify', 'templates'))
  )
);

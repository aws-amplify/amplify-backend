import { runPublish } from './publish_runner.js';

const tag = process.argv[2];

await runPublish({
  includeGitTags: false,
  useLocalRegistry: false,
  snapshotRelease: true,
  tag,
});

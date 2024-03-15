import { runPublish } from './publish_runner.js';

await runPublish({
  includeGitTags: false,
  useLocalRegistry: false,
  snapshotRelease: true,
});

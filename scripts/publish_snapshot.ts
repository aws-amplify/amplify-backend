import { runPublish } from './publish_runner.js';

const tag = process.argv[2];

if (!tag) {
  throw new Error(
    'A tag for release must be provided as first command line argument'
  );
}

if (tag === 'latest') {
  throw new Error("A tag for release must not be 'latest'");
}

await runPublish({
  includeGitTags: false,
  useLocalRegistry: false,
  snapshotRelease: true,
  tag
});

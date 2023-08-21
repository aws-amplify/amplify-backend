import { execa } from 'execa';
import { runPublish } from './publish.js';

const result = await execa('git', ['diff', '--quiet'], { reject: false });
if (result.exitCode !== 0) {
  // non-zero exit code indicates working tree is dirty
  throw new Error(
    `Detected a dirty working tree. Commit or stash changes before publishing a snapshot`
  );
}

// this command will write staged changesets into changelog files and update versions
// this is reverted at the end of this script
await execa('changeset', ['version'], {
  stdio: 'inherit',
});

await runPublish({
  includeGitTags: false,
  useLocalRegistry: true,
});

// this is safe because the script ensures the working tree is clean before starting
await execa('git', ['reset', '--hard']);

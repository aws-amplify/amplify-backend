import { execa } from 'execa';
import { runPublish } from './publish_runner.js';
const isCleanWorkingTree = async (): Promise<boolean> => {
  const buffer = await execa('git', ['status', '--porcelain']);
  return !buffer.stdout.trim();
};
const isCleanTree = await isCleanWorkingTree();
if (!isCleanTree) {
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

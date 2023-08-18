import { execa } from 'execa';

const tagName = process.argv[2];
if (tagName === undefined) {
  throw new Error(
    `Specify a tag name for the snapshot publish as the first and only argument`
  );
}

const result = await execa('git', ['diff', '--quiet'], { reject: false });
if (result.exitCode !== 0) {
  // non-zero exit code indicates working tree is dirty
  throw new Error(
    `Detected a dirty working tree. Commit or stash changes before publishing a snapshot`
  );
}

// this command will write staged changesets into changelog files and update version
// this is reverted at the end of this script
await execa('changeset', ['version', '--snapshot', tagName], {
  stdio: 'inherit',
});
// To change the registry that changeset publishes to, set the `npm_config_registry` environment variable
await execa(
  'changeset',
  ['publish', '--snapshot', '--no-git-tag', '--tag', tagName],
  {
    stdio: 'inherit',
  }
);

// this is safe because the script ensures the working tree is clean before starting
await execa('git', ['reset', '--hard']);

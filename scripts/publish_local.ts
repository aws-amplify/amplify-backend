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

// this command will write staged changesets into changelog files and update versions
// this is reverted at the end of this script
await execa('changeset', ['version'], {
  stdio: 'inherit',
});
await execa('changeset', ['publish', '--no-git-tag', '--tag', tagName], {
  stdio: 'inherit',
  env: {
    // publishes to the local registry
    npm_config_registry: 'http://localhost:4873/',
  },
});

// this is safe because the script ensures the working tree is clean before starting
await execa('git', ['reset', '--hard']);

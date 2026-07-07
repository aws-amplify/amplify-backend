import { execa } from 'execa';
import { runPublish } from './publish_runner.js';
import * as path from 'path';
import { runVersion } from './version_runner.js';
import { GitClient } from './components/git_client.js';

const runArgs = process.argv.slice(2);

const keepGitDiff = runArgs.find((arg) => arg === '--keepGitDiff');

const gitClient = new GitClient();

if (!keepGitDiff) {
  await gitClient.ensureWorkingTreeIsClean();
}

/**
 * Revert the version/changelog mutations that `runVersion()` writes.
 *
 * MUST run even when publishing fails partway through. `runVersion()` edits
 * `package.json` + `CHANGELOG.md` files up front; if `runPublish()` then throws
 * (e.g. a transient `ECONNREFUSED` to the local proxy), leaving those edits
 * behind poisons every retry: the next `vend` calls `ensureWorkingTreeIsClean()`
 * and aborts with "Dirty working tree detected", turning all remaining retry
 * attempts into instant failures. Reverting in a `finally` keeps each attempt
 * self-contained.
 */
const revertVersionMutations = async () => {
  // safe because the script ensures the working tree is clean before starting
  await execa('git', ['reset', '--hard']);

  // if any packages have not been published yet, this script will produce a new changelog file
  // this is not cleaned up by git reset because the file is not tracked by git yet
  // this command cleans up those changelog files
  await execa('git', [
    'clean',
    '-f',
    '--',
    path.join('packages', '**', 'CHANGELOG.md'),
  ]);
};

try {
  // this command will write staged changesets into changelog files and update versions
  // this is reverted in the finally block below
  await runVersion();

  await runPublish({
    includeGitTags: false,
    useLocalRegistry: true,
  });
} finally {
  if (!keepGitDiff) {
    await revertVersionMutations();
  }
}

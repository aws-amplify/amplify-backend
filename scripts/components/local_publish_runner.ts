import { execa } from 'execa';
import { runPublish } from './publish_runner.js';
import path from 'path';

const isCleanWorkingTree = async (): Promise<boolean> => {
  const buffer = await execa('git', ['status', '--porcelain']);
  return !buffer.stdout.trim();
};

/**
 * Runs provided callback with locally published artifacts.
 * @param callback a callback executed after artifacts are published but before
 * git changes from changeset are reverted.
 */
export const runLocalPublish = async (callback?: () => Promise<void>) => {
  const isCleanTree = await isCleanWorkingTree();
  if (!isCleanTree) {
    throw new Error(
      `Detected a dirty working tree. Commit or stash changes before publishing a snapshot`
    );
  }

  try {
    // this command will write staged changesets into changelog files and update versions
    // this is reverted at the end of this script
    await execa('changeset', ['version'], {
      stdio: 'inherit',
    });

    await runPublish({
      includeGitTags: false,
      useLocalRegistry: true,
    });

    if (callback) {
      await callback();
    }
  } finally {
    // this is safe because the script ensures the working tree is clean before starting
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
  }
};

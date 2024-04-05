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

// this command will write staged changesets into changelog files and update versions
// this is reverted at the end of this script
await runVersion();

await runPublish({
  includeGitTags: false,
  useLocalRegistry: true,
});

if (!keepGitDiff) {
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

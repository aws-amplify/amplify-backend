import { execa } from 'execa';

/**
 * Expects to be run in a git repo and fails if there are any tracked uncommitted changes in the repo
 */
const { stdout: gitDiffFiles } = await execa('git', ['diff', '--name-only']);
const changedFiles = gitDiffFiles
  .toString()
  .split('\n')
  .filter((file) => file.length > 0);

if (changedFiles.length > 0) {
  throw new Error(`Expected no git diff but found found ${changedFiles}`);
}

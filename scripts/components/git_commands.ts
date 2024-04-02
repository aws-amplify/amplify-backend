import { $ } from 'execa';
import { EOL } from 'os';

/**
 * Returns true if the git tree is clean and false if it is dirty
 */
export const isCleanWorkingTree = async () => {
  const { stdout } = await $`git status --porcelain`;
  return !stdout.trim();
};

/**
 * Switches to branchName. Creates the branch if it does not exist
 */
export const switchToBranch = async (branchName: string) => {
  await $`git switch -C ${branchName}`;
};

/**
 * Stages and commits all current changes
 */
export const commitAllChanges = async (message: string) => {
  await $`git add .`;
  await $`git commit --message '${message}'`;
};

/**
 * Push to the remote
 */
export const push = async (
  { force }: { force: boolean } = { force: false }
) => {
  await $`git config push.autoSetupRemote true`;
  await $`git push ${force ? '--force' : ''}`;
};

/**
 * Returns a list of tags that point to the given commit
 */
export const getTagsAtCommit = async (commitHash: string) => {
  const { stdout: tagsString } = await $`git tag --points-at ${commitHash}`;
  return tagsString.split(EOL).filter((line) => line.trim().length > 0);
};

/**
 * Configure the git user email and name
 */
export const configure = async () => {
  // eslint-disable-next-line spellcheck/spell-checker
  await $`git config user.email "github-actions[bot]@users.noreply.github.com"`;
  await $`git config user.name "github-actions[bot]"`;
};

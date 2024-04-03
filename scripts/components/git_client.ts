import { $, execa } from 'execa';
import { EOL } from 'os';

class GitClient {
  private isConfigured = false;
  private originalBranch: string;
  // convenience config for execa;
  private readonly inheritIO = { stdio: 'inherit' } as const;

  /**
   * Returns true if the git tree is clean and false if it is dirty
   */
  isWorkingTreeClean = async () => {
    const { stdout } = await $`git status --porcelain`;
    return !stdout.trim();
  };

  getCurrentBranch = async () => {
    const { stdout: currentBranch } = await $`git branch --show-current`;
    return currentBranch;
  };

  /**
   * Switches to branchName. Creates the branch if it does not exist.
   *
   * Resets the branch to the original one at the end of the process
   */
  switchToBranch = async (branchName: string) => {
    if (!this.originalBranch) {
      this.originalBranch = await this.getCurrentBranch();
      this.registerCleanup(async () => {
        await $`git switch ${this.originalBranch}`;
      });
    }
    await $`git switch -C ${branchName}`;
  };

  /**
   * Stages and commits all current changes
   */
  commitAllChanges = async (message: string) => {
    await this.configure();
    await $(this.inheritIO)`git add .`;
    await $(this.inheritIO)`git commit --message '${message}'`;
  };

  /**
   * Push to the remote
   */
  push = async ({ force }: { force: boolean } = { force: false }) => {
    await this.configure();
    await $(this.inheritIO)`git push ${force ? '--force' : ''}`;
  };

  fetchTags = async () => {
    await $(this.inheritIO)`git fetch --tags`;
  };

  checkout = async (ref: string, paths: string[] = []) => {
    const additionalArgs = paths.length > 0 ? ['--', ...paths] : [];
    await execa('git', ['checkout', ref, ...additionalArgs]);
  };

  status = async () => {
    await $(this.inheritIO)`git status`;
  };

  /**
   * Returns a list of tags that point to the given commit
   */
  getTagsAtCommit = async (commitHash: string) => {
    const { stdout: tagsString } = await $`git tag --points-at ${commitHash}`;
    return tagsString.split(EOL).filter((line) => line.trim().length > 0);
  };

  /**
   * Gets the most recent release commit that is reachable from the input commitHash
   * If no commitHash is specified, HEAD is used as the default
   * By default, the input commitHash is considered in the search (ie if commitHash is a release commit, that commit will be returned)
   * To search for the most recent release commit EXCLUDING commitHash, set inclusive=false
   */
  getNearestReleaseCommit = async (
    commitHash: string = 'HEAD',
    { inclusive }: { inclusive: boolean } = { inclusive: true }
  ) => {
    // get the most recent tag before (or at if inclusive=false) the current release tag
    const { stdout: previousReleaseTag } = await $`git describe ${commitHash}${
      inclusive ? '' : '^'
    } --abbrev=0`;

    // get the commit hash associated with the previous release tag
    const { stdout: previousReleaseCommitHash } =
      await $`git log -1 ${previousReleaseTag} --pretty=%H`;

    // run some sanity checks on the release commit
    await this.validateReleaseCommitHash(previousReleaseCommitHash);

    return previousReleaseCommitHash;
  };

  /**
   * Given a release commit hash A that has tags for one or more package versions,
   * walk through release history and find the previous release tags of all of the packages that were released in commit A
   *
   * Note that this does not mean just looking up the previous release tags.
   * It may be the case that package-A was released in release-5 but the previous release of package-A happened in release-2.
   * This method will walk through past release tags until it finds the previous version of all of the input package versions
   * If a previous version of some package cannot be found, an error is thrown.
   */
  getPreviousReleaseTags = async (releaseCommitHash: string) => {
    await this.validateReleaseCommitHash(releaseCommitHash);
    const releaseTags = await this.getTagsAtCommit(releaseCommitHash);

    /**
     * Local function to convert a release tag string to just the package name
     * Release tags are formatted as <packageName>@<version>. For example: @aws-amplify/auth-construct-alpha@0.6.0-beta.8
     */
    const releaseTagToPackageName = (releaseTag: string) =>
      releaseTag.slice(0, releaseTag.lastIndexOf('@'));

    // create a set of just the package names (strip off the version suffix) associated with this release commit
    const packageNamesRemaining = new Set(
      releaseTags.map(releaseTagToPackageName)
    );

    // initialize the release commit cursor to the commit of the release before the input releaseCommitHash
    let releaseCommitCursor = await this.getNearestReleaseCommit(
      releaseCommitHash,
      {
        inclusive: false,
      }
    );

    // the method return value that we will append release tags to in the loop
    const previousReleaseTags: string[] = [];

    while (packageNamesRemaining.size > 0) {
      const releaseTagsAtCursor = await this.getTagsAtCommit(
        releaseCommitCursor
      );
      releaseTagsAtCursor.forEach((releaseTag) => {
        const packageName = releaseTagToPackageName(releaseTag);
        if (packageNamesRemaining.has(packageName)) {
          // this means we've found the previous version of "packageNameRemaining" that was released in releaseCommitHash
          // so we add it to the return list and remove it from the search set
          previousReleaseTags.push(releaseTag);
          packageNamesRemaining.delete(packageName);
        }
      });
      releaseCommitCursor = await this.getNearestReleaseCommit(
        releaseCommitCursor,
        { inclusive: false }
      );
    }

    return previousReleaseTags;
  };

  private validateReleaseCommitHash = async (releaseCommitHash: string) => {
    // check that the hash points to a valid commit
    const { stdout: hashType } = await $`git cat-file -t ${releaseCommitHash}`;
    if (hashType !== 'commit') {
      throw new Error(
        `Hash ${releaseCommitHash} does not point to a commit in the git tree`
      );
    }

    // check that the commit hash points to a release commit
    const { stdout: commitMessage } =
      await $`git log -1 --pretty="%s" ${releaseCommitHash}`;
    if (!commitMessage.includes('Version Packages')) {
      throw new Error(`
        Expected release commit message to include "Version Packages".
        Instead found ${commitMessage}.
        Make sure commit ${releaseCommitHash} points to a release commit.
      `);
    }

    // check that this commit was made by the github-actions bot
    const { stdout: commitAuthor } =
      await $`git log -1 --pretty="%an" ${releaseCommitHash}`;
    if (!commitAuthor.includes('github-actions[bot]')) {
      throw new Error(`
        Expected release commit commit to be authored by github-actions[bot].
        Instead found ${commitAuthor}.
        Make sure commit ${releaseCommitHash} points to a release commit.
      `);
    }

    // get the release tags associated with the commit
    const releaseTags = await this.getTagsAtCommit(releaseCommitHash);

    if (releaseTags.length === 0) {
      throw new Error(`
        Expected release commit to have associated git tags but none found.
        Make sure commit ${releaseCommitHash} points to a release commit.
      `);
    }
  };

  /**
   * Configure the git user email and name
   */
  private configure = async () => {
    if (this.isConfigured) {
      return;
    }
    const originalEmail = await $`git config user.email`;
    const originalName = await $`git config user.name`;
    const originalAutoSetupRemote = await $`git config push.autoSetupRemote`;

    // eslint-disable-next-line spellcheck/spell-checker
    await $`git config user.email "github-actions[bot]@users.noreply.github.com"`;
    await $`git config user.name "github-actions[bot]"`;

    await $`git config --unset-all push.autoSetupRemote`;
    await $`git config push.autoSetupRemote true`;

    this.registerCleanup(async () => {
      // reset config on exit
      await $`git config user.email ${originalEmail}`;
      await $`git config user.name ${originalName}`;
      await $`git config --unset-all push.autoSetupRemote`;
      await $`git config push.autoSetupRemote ${originalAutoSetupRemote}`;
    });
    this.isConfigured = true;
  };

  private registerCleanup = (cleanupCallback: () => void | Promise<void>) => {
    // register the cleanup callback to common exit events
    // the type assertion is necessary because the types for this method don't accept async callbacks even though the event handlers can execute them
    const cleanupCallbackTypeAssertion = cleanupCallback as () => void;
    process.once('SIGINT', cleanupCallbackTypeAssertion);
    process.once('beforeExit', cleanupCallbackTypeAssertion);
    process.once('SIGTERM', cleanupCallbackTypeAssertion);
    process.once('uncaughtException', cleanupCallbackTypeAssertion);
    process.once('unhandledRejection', cleanupCallbackTypeAssertion);
  };
}

/**
 * Client for interacting with the local git CLI
 */
export const gitClient = new GitClient();

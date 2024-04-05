import { EOL } from 'os';
import { GitClient } from './git_client.js';
import { NpmClient } from './npm_client.js';
import { GithubClient } from './github_client.js';
import { DistTagMover } from './dist_tag_mover.js';

/**
 * Orchestrates the process of "un-deprecating" packages associated with a release.
 * Also moves any npm dist-tags associated with the previous package versions to the now un-deprecated versions
 */
export class ReleaseRestorer {
  /**
   * Initialize with deprecation config and necessary clients
   */
  constructor(
    private readonly gitRefToStartReleaseSearchFrom: string,
    private readonly githubClient: GithubClient,
    private readonly gitClient: GitClient,
    private readonly npmClient: NpmClient,
    private readonly distTagMover: DistTagMover
  ) {}

  /**
   * This method is the "undo" button for the ReleaseDeprecator.
   *
   * There are times when we may deprecate a release and want to restore it at a later time.
   * For example, if a new release exposes a service bug, we may deprecate the release, patch the service bug,
   * then restore the release once it works with the fixed service.
   *
   * Running this method without running the deprecateRelease method is effectively a no-op (because the current release is already "un-deprecated")
   */
  restoreRelease = async () => {
    await this.gitClient.ensureWorkingTreeIsClean();

    const releaseCommitHashToRestore =
      await this.gitClient.getNearestReleaseCommit(
        this.gitRefToStartReleaseSearchFrom
      );

    const releaseTagsToRestore = await this.gitClient.getTagsAtCommit(
      releaseCommitHashToRestore
    );

    const previousReleaseTags = await this.gitClient.getPreviousReleaseTags(
      releaseCommitHashToRestore
    );

    // first create the changeset restore PR
    // this PR restores the changeset files that were part of the release but does NOT revert the package.json and changelog changes
    const prBranch = `restore_changeset/${releaseCommitHashToRestore}`;

    await this.gitClient.switchToBranch(prBranch);
    await this.gitClient.checkout(releaseCommitHashToRestore, ['.changeset']);
    await this.gitClient.status();
    await this.gitClient.commitAllChanges(
      `Restoring updates to the .changeset directory made by release commit ${releaseCommitHashToRestore}`
    );
    await this.gitClient.push({ force: true });

    const { pullRequestUrl: prUrl } = await this.githubClient.createPullRequest(
      {
        head: prBranch,
        title: `Restore release ${releaseCommitHashToRestore}`,
        body: `Restoring updates to the .changeset directory made by release commit ${releaseCommitHashToRestore}`,
      }
    );

    console.log(`Created release restoration PR at ${prUrl}`);

    // if anything fails before this point, we haven't actually modified anything on NPM yet.
    // now we actually update the npm dist tags and mark the packages as un-deprecated

    for (const releaseTag of releaseTagsToRestore) {
      console.log(`Un-deprecating package version ${releaseTag}`);
      await this.npmClient.unDeprecatePackage(releaseTag);
      console.log(`Done!${EOL}`);
    }

    await this.distTagMover.moveDistTags(
      previousReleaseTags,
      releaseTagsToRestore
    );
  };
}

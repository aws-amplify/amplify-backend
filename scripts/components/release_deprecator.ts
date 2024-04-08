import { EOL } from 'os';
import { GitClient } from './git_client.js';
import { NpmClient } from './npm_client.js';
import { GithubClient } from './github_client.js';
import { DistTagMover } from './dist_tag_mover.js';

/**
 * Orchestrates the process of marking the packages in a release as deprecated and moving related npm dist-tags back to the previous package versions
 */
export class ReleaseDeprecator {
  /**
   * Initialize with deprecation config and necessary clients
   */
  constructor(
    private readonly gitRefToStartReleaseSearchFrom: string,
    private readonly deprecationMessage: string,
    private readonly githubClient: GithubClient,
    private readonly gitClient: GitClient,
    private readonly npmClient: NpmClient,
    private readonly distTagMover: DistTagMover
  ) {}

  /**
   * This method deprecates a set of package versions that were released by a single release commit.
   *
   * The steps that it takes are
   * 1. Given a starting commit, find the most recent release commit (this could be the commit itself)
   * 2. Find the git tags associated with that commit. These are the package versions that need to be deprecated
   * 3. Find the git tags associated with the previous versions of the packages that are being deprecated. These are the package versions that need to be marked as "latest" (or whatever the dist-tag for the release is)
   * 5. Creates a rollback PR that resets the .changeset directory to its state before the release
   * 6. Resets the dist-tags to the previous package versions
   * 7. Marks the current package versions as deprecated
   */
  deprecateRelease = async () => {
    await this.gitClient.ensureWorkingTreeIsClean();

    const releaseCommitHashToDeprecate =
      await this.gitClient.getNearestReleaseCommit(
        this.gitRefToStartReleaseSearchFrom
      );

    const releaseTagsToDeprecate = await this.gitClient.getTagsAtCommit(
      releaseCommitHashToDeprecate
    );

    const previousReleaseTags = await this.gitClient.getPreviousReleaseTags(
      releaseCommitHashToDeprecate
    );

    // Create the changeset revert PR
    // This PR restores the changeset files that were part of the release but does NOT revert the package.json and changelog changes
    const prBranch = `revert_changeset/${releaseCommitHashToDeprecate}`;

    await this.gitClient.switchToBranch(prBranch);
    await this.gitClient.checkout(`${releaseCommitHashToDeprecate}^`, [
      '.changeset',
    ]);
    await this.gitClient.status();
    await this.gitClient.commitAllChanges(
      `Reverting updates to the .changeset directory made by release commit ${releaseCommitHashToDeprecate}`
    );
    await this.gitClient.push({ force: true });

    console.log(EOL);

    const { pullRequestUrl: prUrl } = await this.githubClient.createPullRequest(
      {
        head: prBranch,
        title: `Deprecate release ${releaseCommitHashToDeprecate}`,
        body: `Reverting updates to the .changeset directory made by release commit ${releaseCommitHashToDeprecate}`,
      }
    );

    console.log(`Created deprecation PR at ${prUrl}`);

    // if anything fails before this point, we haven't actually modified anything on NPM yet.
    // now we actually update the npm dist tags and mark the packages as deprecated

    await this.distTagMover.moveDistTags(
      releaseTagsToDeprecate,
      previousReleaseTags
    );

    for (const releaseTag of releaseTagsToDeprecate) {
      console.log(`Deprecating package version ${releaseTag}`);
      await this.npmClient.deprecatePackage(
        releaseTag,
        this.deprecationMessage
      );
      console.log(`Done!${EOL}`);
    }
  };
}

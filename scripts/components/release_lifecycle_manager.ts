import { EOL } from 'os';
import { gitClient as _gitClient } from './git_client.js';
import { npmClient as _npmClient } from './npm_client.js';
import { getDistTagFromReleaseTag } from './get_dist_tag_from_release_tag.js';
import { githubClient as _githubClient } from './github_client.js';

/**
 *
 */
export class ReleaseLifecycleManager {
  private readonly registryTarget: 'npm-registry' | 'local-proxy';
  /**
   * Initialize with deprecation config and necessary clients
   */
  constructor(
    private readonly gitRefToStartReleaseSearchFrom: string,
    private readonly useNpmRegistry: boolean,
    private readonly gitClient: typeof _gitClient = _gitClient,
    private readonly npmClient: typeof _npmClient = _npmClient,
    private readonly githubClient: typeof _githubClient = _githubClient
  ) {
    this.registryTarget = this.useNpmRegistry ? 'npm-registry' : 'local-proxy';
    switch (this.registryTarget) {
      case 'npm-registry':
        console.log(
          'useNpmRegistry is TRUE. This run will update package metadata on the public npm package registry.'
        );
        break;
      case 'local-proxy':
        console.log(
          'useNpmRegistry is FALSE. This run will update package metadata on a local npm proxy. No public changes will be made.'
        );
    }
  }

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
  deprecateRelease = async (deprecationMessage: string) => {
    await this.preFlightChecks();

    const releaseCommitHashToDeprecate =
      await this.gitClient.getNearestReleaseCommit(
        this.gitRefToStartReleaseSearchFrom
      );

    const releaseTagsToDeprecate = await this.gitClient.getTagsAtCommit(
      releaseCommitHashToDeprecate
    );

    // if this deprecation is starting from HEAD, we are deprecating the most recent release and need to point dist-tags back to their previous state
    // if we are deprecating a past release, then the dist-tags have moved on to newer versions and we do not need to reset them
    const releaseTagsToRestoreDistTagPointers =
      this.gitRefToStartReleaseSearchFrom === 'HEAD'
        ? await this.gitClient.getPreviousReleaseTags(
            releaseCommitHashToDeprecate
          )
        : [];

    // first create the changeset revert PR
    // this PR restores the changeset files that were part of the release but does NOT revert the package.json and changelog changes
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

    const { prUrl } = await this.githubClient.createPr({
      head: prBranch,
      title: `Deprecate release ${releaseCommitHashToDeprecate}`,
      body: `Reverting updates to the .changeset directory made by release commit ${releaseCommitHashToDeprecate}`,
    });

    console.log(`Created deprecation PR at ${prUrl}`);

    if (releaseTagsToRestoreDistTagPointers.length > 0) {
      console.log(
        `Pointing dist-tags back to previous versions:${EOL}${releaseTagsToRestoreDistTagPointers.join(
          EOL
        )}${EOL}`
      );
    }

    console.log(
      `Deprecating package versions:${EOL}${releaseTagsToDeprecate.join(
        EOL
      )}${EOL}`
    );

    // if anything fails before this point, we haven't actually modified anything on NPM yet.
    // now we actually update the npm dist tags and mark the packages as deprecated

    for (const releaseTag of releaseTagsToRestoreDistTagPointers) {
      const distTag = getDistTagFromReleaseTag(releaseTag);
      console.log(
        `Restoring dist tag "${distTag}" to package version ${releaseTag}`
      );
      await this.npmClient.setDistTag(releaseTag, distTag);
      console.log(`Done!${EOL}`);
    }

    for (const releaseTag of releaseTagsToDeprecate) {
      console.log(`Deprecating package version ${releaseTag}`);
      await this.npmClient.deprecatePackage(releaseTag, deprecationMessage);
      console.log(`Done!${EOL}`);
    }
  };

  /**
   * This method is the "undo" button for the deprecateRelease method.
   *
   * There are times when we may deprecate a release and want to restore it at a later time.
   * For example, if a new release exposes a service bug, we may deprecate the release, patch the service bug,
   * then restore the release once it works with the fixed service.
   *
   * Running this method without running the deprecateRelease method is effectively a no-op (because the current release is already "un-deprecated")
   */
  restoreRelease = async () => {
    await this.preFlightChecks();
    const searchStartCommit =
      this.gitRefToStartReleaseSearchFrom.length === 0
        ? 'HEAD'
        : this.gitRefToStartReleaseSearchFrom;

    await this.gitClient.fetchTags();

    const releaseCommitHashToRestore =
      await this.gitClient.getNearestReleaseCommit(searchStartCommit);

    const releaseTagsToUnDeprecate = await this.gitClient.getTagsAtCommit(
      releaseCommitHashToRestore
    );

    // if we are restoring the most recent release on the branch, then we need to restore dist-tags as well.
    // if we are restoring a past release, then the dist-tags have already moved on to newer versions and we do not need to reset them
    const releaseTagsToRestoreDistTagPointers =
      searchStartCommit === 'HEAD' ? releaseTagsToUnDeprecate : [];

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

    const { prUrl } = await this.githubClient.createPr({
      head: prBranch,
      title: `Restore release ${releaseCommitHashToRestore}`,
      body: `Restoring updates to the .changeset directory made by release commit ${releaseCommitHashToRestore}`,
    });

    console.log(`Created release restoration PR at ${prUrl}`);

    if (releaseTagsToRestoreDistTagPointers.length > 0) {
      console.log(
        `Restoring dist-tags to package versions:${EOL}${releaseTagsToRestoreDistTagPointers.join(
          EOL
        )}${EOL}`
      );
    }

    console.log(
      `Un-deprecating package versions:${EOL}${releaseTagsToUnDeprecate.join(
        EOL
      )}${EOL}`
    );

    // if anything fails before this point, we haven't actually modified anything on NPM yet.
    // now we actually update the npm dist tags and mark the packages as un-deprecated

    for (const releaseTag of releaseTagsToRestoreDistTagPointers) {
      const distTag = getDistTagFromReleaseTag(releaseTag);
      console.log(
        `Restoring dist tag "${distTag}" to package version ${releaseTag}`
      );
      await this.npmClient.setDistTag(releaseTag, distTag);
      console.log(`Done!${EOL}`);
    }

    for (const releaseTag of releaseTagsToUnDeprecate) {
      console.log(`Un-deprecating package version ${releaseTag}`);
      await this.npmClient.unDeprecatePackage(releaseTag);
      console.log(`Done!${EOL}`);
    }
  };

  private preFlightChecks = async () => {
    if (!(await this.gitClient.isWorkingTreeClean())) {
      throw new Error(`
        Dirty working tree detected.
        The release deprecation workflow requires a clean working tree to create the rollback PR.
      `);
    }
    await this.npmClient.configureNpmRc({ target: this.registryTarget });
  };
}

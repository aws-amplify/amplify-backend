import { getInput } from '@actions/core';
import { gitClient } from './components/git_client.js';
import { githubClient } from './components/github_client.js';
import { EOL } from 'os';
import { npmClient } from './components/npm_client.js';
import { getDistTagFromReleaseTag } from './components/get_dist_tag_from_release_tag.js';
import { execa } from 'execa';

/**
 * This script is the "undo" button for the `deprecate_release.ts` script.
 * There are times when we may deprecate a release and want to restore it at a later time.
 * For example, if a new release exposes a service bug, we may deprecate the release, patch the service bug,
 * then restore the release once it works with the fixed service.
 *
 * Running this script without running the deprecate_release script is effectively a no-op (because the release is already "un-deprecated")
 */

const searchForReleaseStartingFrom = getInput('searchForReleaseStartingFrom');
const registryTarget =
  getInput('useNpmRegistry') === 'true' ? 'npm-registry' : 'local-proxy';

switch (registryTarget) {
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

const searchStartCommit =
  searchForReleaseStartingFrom.length === 0
    ? 'HEAD'
    : searchForReleaseStartingFrom;

if (!(await gitClient.isWorkingTreeClean())) {
  throw new Error(`
    Dirty working tree detected.
    The release deprecation workflow requires a clean working tree to create the rollback PR.
  `);
}

await gitClient.fetchTags();

const releaseCommitHashToRestore = await gitClient.getNearestReleaseCommit(
  searchStartCommit
);

const releaseTagsToUnDeprecate = await gitClient.getTagsAtCommit(
  releaseCommitHashToRestore
);

// if we are restoring the most recent release on the branch, then we need to restore dist-tags as well.
// if we are restoring a past release, then the dist-tags have already moved on to newer versions and we do not need to reset them
const releaseTagsToRestoreDistTagPointers =
  searchStartCommit === 'HEAD' ? releaseTagsToUnDeprecate : [];

// first create the changeset revert PR
// this PR restores the changeset files that were part of the release but does NOT revert the package.json and changelog changes
const prBranch = `revert_changeset/${releaseCommitHashToRestore}`;

await gitClient.switchToBranch(prBranch);
await gitClient.checkout(releaseCommitHashToRestore, ['.changeset']);
await gitClient.status();
await gitClient.commitAllChanges(
  `Restoring updates to the .changeset directory made by release commit ${releaseCommitHashToRestore}`
);
await gitClient.push({ force: true });

const { prUrl } = await githubClient.createPr({
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

if (registryTarget === 'local-proxy') {
  await execa('npm', ['run', 'start:npm-proxy'], { stdio: 'inherit' });
}

await npmClient.configureNpmRc({ target: registryTarget });

for (const releaseTag of releaseTagsToRestoreDistTagPointers) {
  const distTag = getDistTagFromReleaseTag(releaseTag);
  console.log(
    `Restoring dist tag "${distTag}" to package version ${releaseTag}`
  );
  await npmClient.setDistTag(releaseTag, distTag);
  console.log(`Done!${EOL}`);
}

for (const releaseTag of releaseTagsToUnDeprecate) {
  console.log(`Un-deprecating package version ${releaseTag}`);
  await npmClient.unDeprecatePackage(releaseTag);
  console.log(`Done!${EOL}`);
}

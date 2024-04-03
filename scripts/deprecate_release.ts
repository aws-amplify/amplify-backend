import { EOL } from 'os';
import { gitClient } from './components/git_client.js';
import { getInput } from '@actions/core';
import { githubClient } from './components/github_client.js';
import { npmClient } from './components/npm_client.js';
import { getDistTagFromReleaseTag } from './components/get_dist_tag_from_release_tag.js';
import { execa } from 'execa';

/**
 * This script deprecates a set of package versions that were released by a single release commit.
 *
 * The steps that it takes are
 * 1. Given a starting commit (or HEAD by default), find the most recent release commit
 * 2. Finds the git tags associated with that commit. These are the package versions that need to be deprecated
 * 3. Find the git tags associated with the previous versions of the packages that were released. These are the package versions that need to be marked as "latest" (or whatever the dist-tag for the release is)
 * 5. Creates a rollback PR that resets the .changeset directory to its state before the release
 * 6. Resets the dist-tags to the previous package versions
 * 7. Marks the current package versions as deprecated
 */

// getInput() is a function vended by GitHub for looking up workflow input
// to supply inputs when testing locally, define environment variables using the name `INPUT_<INPUTNAME>`
// for example, the input below would look for an environment variable named `INPUT_DEPRECATIONMESSAGE`
const deprecationMessage = getInput('deprecationMessage', { required: true });
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

const releaseCommitHashToDeprecate = await gitClient.getNearestReleaseCommit(
  searchStartCommit
);

const releaseTagsToDeprecate = await gitClient.getTagsAtCommit(
  releaseCommitHashToDeprecate
);

// if this deprecation is starting from HEAD, we are deprecating the most recent release and need to point dist-tags back to their previous state
// if we are deprecating a past release, then the dist-tags have moved on to newer versions and we do not need to reset them
const releaseTagsToRestoreDistTagPointers =
  searchStartCommit === 'HEAD'
    ? await gitClient.getPreviousReleaseTags(releaseCommitHashToDeprecate)
    : [];

// first create the changeset revert PR
// this PR restores the changeset files that were part of the release but does NOT revert the package.json and changelog changes
const prBranch = `revert_changeset/${releaseCommitHashToDeprecate}`;

await gitClient.switchToBranch(prBranch);
await gitClient.checkout(`${releaseCommitHashToDeprecate}^`, ['.changeset']);
await gitClient.status();
await gitClient.commitAllChanges(
  `Reverting updates to the .changeset directory made by release commit ${releaseCommitHashToDeprecate}`
);
await gitClient.push({ force: true });

const { prUrl } = await githubClient.createPr({
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
  `Deprecating package versions:${EOL}${releaseTagsToDeprecate.join(EOL)}${EOL}`
);

// if anything fails before this point, we haven't actually modified anything on NPM yet.
// now we actually update the npm dist tags and mark the packages as deprecated

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

for (const releaseTag of releaseTagsToDeprecate) {
  console.log(`Deprecating package version ${releaseTag}`);
  await npmClient.deprecatePackage(releaseTag, deprecationMessage);
  console.log(`Done!${EOL}`);
}

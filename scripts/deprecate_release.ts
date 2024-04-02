import { $ } from 'execa';
import { EOL } from 'os';
import { parseArgs } from 'util';
import {
  commitAllChanges,
  configure,
  getTagsAtCommit,
  isCleanWorkingTree,
  push,
  switchToBranch,
} from './components/git_commands.js';
import { getOctokit, context as ghContext } from '@actions/github';
import * as fsp from 'fs/promises';

/**
 * This script deprecates a set of package versions that were released by a single release commit.
 *
 * The steps that it takes are
 * 1. Verifies that the input commit-hash is a valid release commit
 * 2. Finds the git tags associated with that commit. These are the package versions that need to be deprecated
 * 3. Finds the release commit _before_ the input commit-hash
 * 4. Finds the git tags associated with the previous release commit. These are the package versions that need to be marked as "latest" (or whatever the dist-tag for the release is)
 * 5. Creates a rollback PR that resets the .changeset directory to its state at the previous release
 * 6. Marks the previous package versions as latest
 * 7. Marks the current package versions as deprecated
 */

// convenience config for execa;
const inheritIO = { stdio: 'inherit' } as const;

const args = parseArgs({
  options: {
    'commit-hash': {
      type: 'string',
    },
    'deprecation-message': {
      type: 'string',
    },
  },
});

/* ====== Validation ====== */

// verify that args are specified
if (!args.values['commit-hash'] || !args.values['deprecation-message']) {
  throw new Error(`
    Usage: npx deprecate_release.ts --commit-hash <hash> --deprecation-message <message>
  `);
}

const {
  ['commit-hash']: commitHash,
  ['deprecation-message']: deprecationMessage,
} = args.values;

if (commitHash.length === 0 || deprecationMessage.length === 0) {
  throw new Error('commit-message and deprecation-message must be non-empty');
}

await $`git fetch --tags`;

// check that the hash points to a valid commit
const { stdout: hashType } = await $`git cat-file -t ${commitHash}`;
if (hashType !== 'commit') {
  throw new Error('Specify a valid commit hash to deprecate');
}

// check that the commit hash points to a release commit
const { stdout: commitMessage } =
  await $`git log -1 --pretty="%s" ${commitHash}`;
if (!commitMessage.includes('Version Packages')) {
  throw new Error(`
    Expected commit message to include "Version Packages".
    Instead found ${commitMessage}.
    Make sure this commit hash points to a release commit.
  `);
}

// check that this commit was made by the github-actions bot
const { stdout: commitAuthor } =
  await $`git log -1 --pretty="%an" ${commitHash}`;
if (!commitAuthor.includes('github-actions[bot]')) {
  throw new Error(`
    Expected commit to be authored by github-actions[bot].
    Instead found ${commitAuthor}.
    Make sure this commit hash points to a release commit.
  `);
}

// get the release tags associated with the commit
// each tag name is the package name and version as '<packageName>@<version>'
// this can be used directly as the input to npm deprecate
const packageVersionsToDeprecate = await getTagsAtCommit(commitHash);

if (packageVersionsToDeprecate.length === 0) {
  throw new Error(`
    Could not find any release tags associated with this commit.
    Release deprecation is only supported for releases that have associated git tags.
  `);
}

// get the most recent tag before the current release tag
const { stdout: previousReleaseTag } =
  await $`git describe ${packageVersionsToDeprecate[0]}^ --abbrev=0`;

// get the commit hash associated with the previous release tag
const { stdout: previousReleaseCommitHash } =
  await $`git log -1 ${previousReleaseTag} --pretty=%H`;

// get all the release tags associated with the previous commit
// this is the list of package versions that need to be marked as latest
const packageVersionsToRestore = await getTagsAtCommit(
  previousReleaseCommitHash
);
if (packageVersionsToRestore.length === 0) {
  throw new Error(`
    Could not find any release tags for the previous release.
    Ensure that there is previous release commit that is reachable from the current release commit in the git history.
  `);
}

if (!(await isCleanWorkingTree())) {
  throw new Error(`
    Dirty working tree detected.
    The release deprecation workflow requires a clean working tree to create the rollback PR.
  `);
}

// now we need to grab this dist tag from the previous release tag
// given a string like '@aws-amplify/auth-construct-alpha@0.6.0-beta.8', this regex will grab 'beta' from the string
// for a non-pre release tag like @aws-amplify/backend-cli@0.10.0, this regex will not match and we default to the 'latest' tag
// this logic assumes that all of the previous release package versions have the same dist tag
// (this should always be the case when using changesets for releases)
const distTagMatch = previousReleaseTag.match(
  /\.\d+-(?<distTag>[\w\-.]+)\.\d+$/
);

const distTag = distTagMatch?.groups?.distTag ?? 'latest';

/* ====== Execution ====== */

// first create the changeset revert PR
// this PR restores the changeset files that were part of the release but does NOT revert the package.json and changelog changes

const prBranch = `restore_release/${previousReleaseCommitHash}`;

await configure();

await switchToBranch(prBranch);

// using checkout instead of restore because we want to restore this directory but not remove files that have been added since
await $(inheritIO)`git checkout ${previousReleaseCommitHash} -- .changeset`;
await $(inheritIO)`git status`;
await commitAllChanges(
  `Restoring .changeset directory to ${previousReleaseCommitHash}`
);
await push({ force: true });

const ghToken = process.env.GITHUB_TOKEN;
if (!ghToken) {
  throw new Error(`
    The GitHub access token must be set in the GITHUB_TOKEN environment variable.
  `);
}

const npmToken = process.env.NPM_TOKEN;
if (!npmToken) {
  throw new Error(`
    The NPM access token must be set in the NPM_TOKEN environment variable.
  `);
}

const baseBranch = ghContext.ref.replace('refs/heads/', '');

const { rest: ghClient } = getOctokit(ghToken);
const prResult = await ghClient.pulls.create({
  base: baseBranch,
  head: prBranch,
  title: `Deprecate release ${commitHash}`,
  body: `Restores the contents of the .changeset directory to the previous release commit state ${previousReleaseCommitHash}.`,
  ...ghContext.repo,
});

console.log(`Created rollback PR at ${prResult.data.url}`);

// setup the .npmrc file using NPM_TOKEN
await fsp.writeFile(
  '.npmrc',
  // eslint-disable-next-line spellcheck/spell-checker
  `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}${EOL}`
);

console.log(
  `Restoring dist tag "${distTag}" to package versions:${EOL}${packageVersionsToRestore.join(
    EOL
  )}${EOL}`
);

console.log(
  `Deprecating package versions:${EOL}${packageVersionsToDeprecate.join(
    EOL
  )}${EOL}`
);

// if anything fails before this point, we haven't actually modified anything on NPM yet.
// now we actually update the npm dist tags and mark the packages as deprecated

for (const packageVersion of packageVersionsToRestore) {
  console.log(
    `Restoring dist tag "${distTag}" to package version ${packageVersion}`
  );
  // TODO uncomment but testing in "dry-run" mode for now
  // await $(inheritIO)`npm dist-tag add ${packageVersion} ${distTag}`;
  console.log(`Done!${EOL}`);
}

for (const packageVersion of packageVersionsToDeprecate) {
  console.log(`Deprecating package version ${packageVersion}`);
  // TODO uncomment but testing in "dry-run" mode for now
  // await $(inheritIO)`npm deprecate ${packageVersion} "${deprecationMessage}"`;
  console.log(`Done!${EOL}`);
}

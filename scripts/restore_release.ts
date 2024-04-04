import { getInput } from '@actions/core';
import { ReleaseLifecycleManager } from './components/release_lifecycle_manager.js';
import { GitClient } from './components/git_client.js';
import { GithubClient } from './components/github_client.js';
import { NpmClient, loadNpmTokenFromEnvVar } from './components/npm_client.js';

const searchForReleaseStartingFrom = getInput('searchForReleaseStartingFrom', {
  required: true,
});
const useNpmRegistry = getInput('useNpmRegistry', { required: true });

if (useNpmRegistry) {
  console.log(
    'useNpmRegistry is TRUE. This run will update package metadata on the public npm package registry.'
  );
} else {
  console.log(
    'useNpmRegistry is FALSE. This run will update package metadata on a local npm proxy. No public changes will be made.'
  );
}

const releaseLifecycleManager = new ReleaseLifecycleManager(
  searchForReleaseStartingFrom,
  new GithubClient(),
  new GitClient(),
  new NpmClient(useNpmRegistry ? loadNpmTokenFromEnvVar() : null)
);

try {
  await releaseLifecycleManager.restoreRelease();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}

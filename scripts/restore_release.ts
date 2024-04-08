import { getInput } from '@actions/core';
import { ReleaseRestorer } from './components/release_restorer.js';
import { GitClient } from './components/git_client.js';
import { GithubClient } from './components/github_client.js';
import { NpmClient, loadNpmTokenFromEnvVar } from './components/npm_client.js';
import { DistTagMover } from './components/dist_tag_mover.js';

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
  await import('./start_npm_proxy.js');
}

const npmClient = new NpmClient(
  useNpmRegistry ? loadNpmTokenFromEnvVar() : null
);

await npmClient.configureNpmRc();

const releaseRestorer = new ReleaseRestorer(
  searchForReleaseStartingFrom,
  new GithubClient(),
  new GitClient(),
  npmClient,
  new DistTagMover(npmClient)
);

try {
  await releaseRestorer.restoreRelease();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}

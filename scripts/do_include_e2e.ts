import { context as ghContext } from '@actions/github';
import { isVersionPackagesCommit } from './components/is_version_packages_commit.js';
import { GithubClient } from './components/github_client.js';

const { GITHUB_EVENT_NAME: eventName, GITHUB_REF_NAME: refName } = process.env;

const gitHubClient = new GithubClient();

const prHasRunE2ELabel = async () => {
  if (!ghContext.payload.pull_request) {
    // event is not a pull request
    return false;
  }
  const prInfo = await gitHubClient.fetchPullRequest(
    ghContext.payload.pull_request.number
  );
  const hasRunE2ELabel = prInfo.labels.some(
    (label) => label.name === 'run-e2e'
  );
  return hasRunE2ELabel;
};

// e2e tests run if...
const doIncludeE2e =
  await // this workflow is running on a push to a branch besides hotfix
  ((eventName === 'push' && refName !== 'hotfix') ||
    // this workflow is running on a version packages push to hotfix
    (eventName === 'push' &&
      refName === 'hotfix' &&
      isVersionPackagesCommit()) ||
    // this workflow was triggered manually
    eventName === 'workflow_dispatch' ||
    // this workflow is running on a PR with the 'run-e2e' label
    (await prHasRunE2ELabel()));

// print a true/false of whether e2e tests should run
console.log(doIncludeE2e);

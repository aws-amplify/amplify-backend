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

const isPushToBranchBesidesHotfix =
  eventName === 'push' && refName !== 'hotfix';
const isVersionPackagesPushToHotfix =
  eventName === 'push' && refName === 'hotfix' && isVersionPackagesCommit();

const isWorkflowTriggeredManually = eventName === 'workflow_dispatch';
const isWorkflowTriggeredBySchedule = eventName == 'schedule';
const isPullRequestWithRunE2ELabel = await prHasRunE2ELabel();

const doIncludeE2e =
  isPushToBranchBesidesHotfix ||
  isVersionPackagesPushToHotfix ||
  isWorkflowTriggeredManually ||
  isWorkflowTriggeredBySchedule ||
  isPullRequestWithRunE2ELabel;

// print a true/false of whether e2e tests should run
console.log(doIncludeE2e);

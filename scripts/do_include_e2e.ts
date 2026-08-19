import { context as ghContext } from '@actions/github';
import { isVersionPackagesCommit } from './components/is_version_packages_commit.js';
import { GithubClient } from './components/github_client.js';

const { GITHUB_EVENT_NAME: eventName, GITHUB_REF_NAME: refName } = process.env;

const gitHubClient = new GithubClient();

// Base branches whose (internal) PRs always run e2e without needing the
// `run-e2e` label — long-lived branches where an e2e regression must surface
// before merge. e2e needs AWS OIDC credentials that fork PRs cannot obtain, so
// auto-run is gated on the PR originating from this repo (not a fork); fork PRs
// still fall back to the label path and never trip the error below.
const E2E_AUTO_RUN_BASE_BRANCHES = new Set(['main']);
const INTERNAL_REPO = 'aws-amplify/amplify-backend';

const shouldPullRequestRunE2E = async () => {
  if (!ghContext.payload.pull_request) {
    // event is not a pull request
    return false;
  }
  const prInfo = await gitHubClient.fetchPullRequest(
    ghContext.payload.pull_request.number,
  );
  const isInternalPr = prInfo.head?.repo?.full_name === INTERNAL_REPO;
  const hasRunE2ELabel = prInfo.labels.some(
    (label) => label.name === 'run-e2e',
  );
  const targetsAutoRunBase =
    isInternalPr && E2E_AUTO_RUN_BASE_BRANCHES.has(prInfo.base.ref);
  const runE2E = hasRunE2ELabel || targetsAutoRunBase;

  if (runE2E && !isInternalPr) {
    throw new Error(
      'PR must be opened from a branch in aws-amplify/amplify-backend repository when running e2e tests.',
    );
  }

  return runE2E;
};

const isPushToBranchBesidesHotfix =
  eventName === 'push' && refName !== 'hotfix';
const isVersionPackagesPushToHotfix =
  eventName === 'push' && refName === 'hotfix' && isVersionPackagesCommit();

const isWorkflowTriggeredManually = eventName === 'workflow_dispatch';
const isWorkflowTriggeredBySchedule = eventName == 'schedule';
const isPullRequestThatShouldRunE2E = await shouldPullRequestRunE2E();

const doIncludeE2e =
  isPushToBranchBesidesHotfix ||
  isVersionPackagesPushToHotfix ||
  isWorkflowTriggeredManually ||
  isWorkflowTriggeredBySchedule ||
  isPullRequestThatShouldRunE2E;

// print a true/false of whether e2e tests should run
console.log(doIncludeE2e);

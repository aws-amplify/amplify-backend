import { context as ghContext } from '@actions/github';
import { isVersionPackagesCommit } from './components/is_version_packages_commit.js';
import { GithubClient } from './components/github_client.js';

const { GITHUB_EVENT_NAME: eventName, GITHUB_REF_NAME: refName } = process.env;

const gitHubClient = new GithubClient();

// Branches whose PRs always run e2e — long-lived integration branches where
// e2e regressions must surface before merge, without requiring a label.
// `main` is included so that the snapshot/iac-hosting -> main release PR
// (and any PR landing on mainline) exercises e2e before merge.
const E2E_AUTO_RUN_BASE_BRANCHES = new Set(['snapshot/iac-hosting', 'main']);

const inspectPullRequest = async () => {
  if (!ghContext.payload.pull_request) {
    return { runE2E: false } as const;
  }
  const prInfo = await gitHubClient.fetchPullRequest(
    ghContext.payload.pull_request.number,
  );
  const hasRunE2ELabel = prInfo.labels.some(
    (label) => label.name === 'run-e2e',
  );
  const targetsAutoRunBase = E2E_AUTO_RUN_BASE_BRANCHES.has(prInfo.base.ref);
  const runE2E = hasRunE2ELabel || targetsAutoRunBase;

  if (
    runE2E &&
    prInfo.head?.repo?.full_name !== 'aws-amplify/amplify-backend'
  ) {
    throw new Error(
      'PR must be opened from a branch in aws-amplify/amplify-backend repository when running e2e tests.',
    );
  }

  return { runE2E } as const;
};

const isPushToBranchBesidesHotfix =
  eventName === 'push' && refName !== 'hotfix';
const isVersionPackagesPushToHotfix =
  eventName === 'push' && refName === 'hotfix' && isVersionPackagesCommit();

const isWorkflowTriggeredManually = eventName === 'workflow_dispatch';
const isWorkflowTriggeredBySchedule = eventName == 'schedule';
const { runE2E: isPullRequestThatShouldRunE2E } = await inspectPullRequest();

const doIncludeE2e =
  isPushToBranchBesidesHotfix ||
  isVersionPackagesPushToHotfix ||
  isWorkflowTriggeredManually ||
  isWorkflowTriggeredBySchedule ||
  isPullRequestThatShouldRunE2E;

// print a true/false of whether e2e tests should run
console.log(doIncludeE2e);

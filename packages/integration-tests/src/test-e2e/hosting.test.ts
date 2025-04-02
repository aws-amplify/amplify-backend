import { before, describe, it } from 'node:test';
import assert from 'assert';
import {
  AmplifyClient,
  App,
  CreateBranchCommand,
  DeleteBranchCommand,
  GetBranchCommand,
  GetJobCommand,
  JobStatus,
  JobSummary,
  LimitExceededException,
  ListAppsCommand,
  ListAppsCommandOutput,
  ListBranchesCommand,
  ListJobsCommand,
  ListJobsCommandOutput,
  NotFoundException,
  StartJobCommand,
  UpdateAppCommand,
  UpdateBranchCommand,
} from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { runWithRetry } from '../retry.js';

const amplifyClient = new AmplifyClient({
  ...e2eToolingClientConfig,
  maxAttempts: 5,
});

/**
 * This test asserts that Amplify Hosting can deploy sample app using amplify-backed built from sources.
 *
 * The test requires an Amplify App named 'hosting-test-app' to be created upfront in per every account/region pair we test in.
 * The App is a pre-requisite because it requires manual step to connect repository.
 * The App should be connected to amplify-backend repo (main repo in health_checks workflows, your fork if you're running test locally).
 *
 * The test has the following inputs passed via environment variables:
 * 1. AMPLIFY_BACKEND_TESTS_HOSTING_TEST_BRANCH_NAME - branch under test.
 *    Code must be pushed to GitHub - main repo or fork (depending on how Amplify App has been set up).
 * 2. AMPLIFY_BACKEND_TESTS_HOSTING_TEST_COMMIT_SHA - a commit hash to use when kicking off the build.
 *    The commit must be pushed to GitHub.
 *
 *
 *  In order to test this locally:
 *  1. Create Amplify App named 'hosting-test-app' connected to your fork of amplify-backend repo.
 *  2. Make changes, push to your fork.
 *  3. Run this test with required environment variables set (see definition above).
 */

const testAppName = 'hosting-test-app';

void describe('hosting', () => {
  let appId: string;
  let branchName: string;
  let commitSha: string;

  before(async () => {
    assert.ok(
      process.env.AMPLIFY_BACKEND_TESTS_HOSTING_TEST_BRANCH_NAME,
      'AMPLIFY_BACKEND_TESTS_HOSTING_TEST_BRANCH_NAME environment variable must be set.',
    );
    branchName = process.env.AMPLIFY_BACKEND_TESTS_HOSTING_TEST_BRANCH_NAME;
    assert.ok(
      process.env.AMPLIFY_BACKEND_TESTS_HOSTING_TEST_COMMIT_SHA,
      'AMPLIFY_BACKEND_TESTS_HOSTING_TEST_COMMIT_SHA environment variable must be set.',
    );
    commitSha = process.env.AMPLIFY_BACKEND_TESTS_HOSTING_TEST_COMMIT_SHA;
    appId = await findTestingAppId();
    await pruneStaleBranches(appId);
    await ensureBranchIsConnected(appId, branchName);
  });
  void it('can deploy backend', async () => {
    const deploymentJob = await startOrGetDeploymentJob(
      appId,
      branchName,
      commitSha,
    );
    if (deploymentJob.status !== JobStatus.SUCCEED) {
      assert.ok(deploymentJob.jobId);
      await waitForSuccessfulJobCompletion(
        appId,
        branchName,
        deploymentJob.jobId,
      );
    }
  });
});

const waitForSuccessfulJobCompletion = async (
  appId: string,
  branchName: string,
  jobId: string,
) => {
  const timeoutMs = 10 * 60 * 1000; // 10 minutes;
  const pollingInterval = 10 * 1000; // 10 seconds;
  const startTime = Date.now();
  while (Date.now() - startTime <= timeoutMs) {
    const getJobResult = await amplifyClient.send(
      new GetJobCommand({
        appId,
        branchName,
        jobId,
      }),
    );
    const jobSummary = getJobResult.job?.summary;
    assert.ok(jobSummary);
    console.log(`Job ${jobId} is in status ${jobSummary.status}`);
    // Fail if job is in terminal non-successful state.
    assert.ok(
      jobSummary.status !== 'FAILED',
      `Job ${jobId} has failed. Check logs in the AWS Console.`,
    );
    assert.ok(
      jobSummary.status !== 'CANCELLED',
      `Job ${jobId} has been canceled. Check logs in the AWS Console.`,
    );
    if (jobSummary.status === 'SUCCEED') {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, pollingInterval));
  }
};

const startOrGetDeploymentJob = async (
  appId: string,
  branchName: string,
  commitSha: string,
): Promise<JobSummary> => {
  return runWithRetry(
    async () => {
      const existingJobs = await listJobs(appId, branchName);
      // Find existing job that's either successful or is in progress first that belongs to the commit.
      const existingJob = existingJobs.find((item) => {
        return (
          item.commitId === commitSha &&
          (item.status === JobStatus.SUCCEED ||
            item.status === JobStatus.RUNNING ||
            item.status === JobStatus.PENDING)
        );
      });
      if (existingJob) {
        console.log(
          `Found existing job ${existingJob.jobId} for commit ${commitSha} in status ${existingJob.status}`,
        );
        return existingJob;
      }
      const startJobResult = await amplifyClient.send(
        new StartJobCommand({
          appId,
          branchName,
          commitId: commitSha,
          jobType: 'RELEASE',
        }),
      );
      assert.ok(startJobResult.jobSummary);
      const newJob = startJobResult.jobSummary;
      console.log(`Started a new job ${newJob.jobId} for commit ${commitSha}`);
      return newJob;
    },
    (error) => {
      // This happens if there's any deployment in progress for a branch.
      // In that case retry couple of times with a delay.
      // If this becomes un-effective we should create more apps and shard the traffic.
      return error instanceof LimitExceededException;
    },
    5, // maxAttempts
    60 * 1000, // delayMs
  );
};

const listJobs = async (
  appId: string,
  branchName: string,
): Promise<Array<JobSummary>> => {
  const jobs: Array<JobSummary> = [];
  let listJobsResult: ListJobsCommandOutput | undefined;
  do {
    listJobsResult = await amplifyClient.send(
      new ListJobsCommand({
        appId,
        branchName,
        maxResults: 50,
        nextToken: listJobsResult?.nextToken,
      }),
    );
    if (listJobsResult.jobSummaries) {
      jobs.push(...listJobsResult.jobSummaries);
    }
  } while (listJobsResult.nextToken);

  return jobs;
};

/**
 * Ensures that branch is connected with desired settings.
 *
 * Desired settings:
 * 1. Auto builds are turned off (we kick jobs explicitly from test).
 */
const ensureBranchIsConnected = async (appId: string, branchName: string) => {
  try {
    const getBranchResult = await amplifyClient.send(
      new GetBranchCommand({
        appId,
        branchName,
      }),
    );
    assert.ok(getBranchResult.branch);
    console.log(`Branch ${branchName} is already connected`);
    const branch = getBranchResult.branch;
    if (getBranchResult.branch.enableAutoBuild) {
      console.log(`Updating branch ${branchName} configuration`);
      await amplifyClient.send(
        new UpdateBranchCommand({
          appId,
          ...branch,
          enableAutoBuild: false,
        }),
      );
    }
  } catch (e) {
    if (!(e instanceof NotFoundException)) {
      throw e;
    }
    console.log(`Connecting branch ${branchName}`);
    await amplifyClient.send(
      new CreateBranchCommand({
        appId,
        branchName,

        enableAutoBuild: false,
      }),
    );
  }
};

/**
 * Prune branches that haven't seen any activity for a period of time.
 * Single app can have up to 50 branches. We're using a predefined app for hosting tests, as setup requires manual steps.
 * Therefore, we need to collect garbage to avoid hitting the limit.
 *
 * Note: if we ever hit the limit due to test traffic volume, then we should consider more aggressive sharding across
 * couple of predefined apps per account per region.
 */
const pruneStaleBranches = async (appId: string) => {
  const staleDurationInMilliseconds = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const listBranchesResult = await amplifyClient.send(
    new ListBranchesCommand({
      appId,
      maxResults: 50,
    }),
  );

  for (const branch of listBranchesResult.branches ?? []) {
    if (
      branch.updateTime &&
      Date.now() - branch.updateTime.getTime() > staleDurationInMilliseconds
    ) {
      await amplifyClient.send(
        new DeleteBranchCommand({
          appId,
          branchName: branch.branchName,
        }),
      );
    }
  }
};

const findTestingAppId = async (): Promise<string> => {
  let listAppsResult: ListAppsCommandOutput | undefined;
  do {
    listAppsResult = await amplifyClient.send(
      new ListAppsCommand({
        maxResults: 100,
        nextToken: listAppsResult?.nextToken,
      }),
    );

    const testApp = listAppsResult?.apps?.find(
      (item) => item.name === testAppName,
    );
    if (testApp?.appId) {
      await ensureAppIsConfiguredProperly(testApp);
      return testApp.appId;
    }
  } while (listAppsResult.nextToken);

  assert.fail(
    `App named '${testAppName}' is missing in test account and region.`,
  );
};

const ensureAppIsConfiguredProperly = async (app: App) => {
  assert.ok(
    app.repository?.includes('amplify-backend'),
    'App must be connected to amplify-backend repository, either main repo or fork',
  );
  assert.ok(app.appArn);
  const accountId = app.appArn.split(':')[4];
  await amplifyClient.send(
    new UpdateAppCommand({
      ...app,
      buildSpec: buildSpec,
      iamServiceRoleArn: `arn:aws:iam::${accountId}:role/e2e-execution`,
    }),
  );
};

const buildSpec = `version: 1
env:
  variables:
    NODE_OPTIONS: '--max-old-space-size=4000'
backend:
  phases:
    build:
      commands:
        # TODO remove node install when Hosting rolls new image.
        - nvm install 18
        # Uninstall Gen1 CLI, otherwise npm link below has a conflict on amplify binary
        - npm uninstall -g @aws-amplify/cli
        - npm ci --cache .npm --prefer-offline
        - npm run build
        - npm link ./packages/cli
        - cd packages/integration-tests/src/test-projects/hosting-test-app
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
        - cd -
frontend:
  phases:
    build:
      commands:
        - mkdir ./dist && touch ./dist/index.html
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - .npm/**/*
`;

import { after, before, describe, it } from 'node:test';
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
 * 3. AMPLIFY_BACKEND_TESTS_E2E_EXECUTION_ROLE_ARN - an arn of execution role. The execution role must have
 *    AmplifyBackendDeployFullAccess policy attached and establish trust relationship with 'amplify.amazonaws.com'
 *    service principal.
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
  let executionRoleArn: string;
  let jobId: string | undefined;

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
    assert.ok(
      process.env.AMPLIFY_BACKEND_TESTS_E2E_EXECUTION_ROLE_ARN,
      'AMPLIFY_BACKEND_TESTS_E2E_EXECUTION_ROLE_ARN environment variable must be set.',
    );
    executionRoleArn = process.env.AMPLIFY_BACKEND_TESTS_E2E_EXECUTION_ROLE_ARN;
    appId = await findTestingAppId(executionRoleArn);
    await pruneStaleBranches(appId);
    await ensureBranchIsConnected(appId, branchName);
  });

  after(async () => {
    // Print logs
    if (jobId) {
      const getJobResult = await amplifyClient.send(
        new GetJobCommand({
          appId,
          branchName,
          jobId,
        }),
      );
      for (const step of getJobResult.job?.steps ?? []) {
        // Steps have pre-signed URLs.
        if (step.logUrl) {
          const logResponse = await fetch(step.logUrl);
          console.log(await logResponse.text());
        }
      }
    }

    // Disconnect a branch if we're not on 'main' eagerly.
    // So that we try to not leave garbage and hit 50 branches per app limit.
    // The trade-offs considered here are:
    // 1. This test's goal is to assert that our tooling works in hosting.
    //    Therefore, re-deploying same app over and over again is fine (on main).
    //    Functional coverage of deployed resources is tested by other tests.
    // 2. We're using pre-created set of apps. Therefore, our priority is to utilize them
    //    efficiently. Which means some compromises on test isolation.
    // 3. Disconnecting a branch (deleting a branch) triggers main stack deletion.
    //    Which may run asynchronously and lead to race conditions on workflow re-tries.
    // 4. For now, we're choosing to
    //    1. Keep 'main' always connected. We're building main every day. It doesn't make sense to disconnect it.
    //    2. Eagerly delete branch otherwise (PR builds mostly).
    //       If this becomes problematic due to race conditions, then we should revisit this and allow some grace period
    //       before we delete branch in this case.
    if (branchName !== 'main') {
      await amplifyClient.send(
        new DeleteBranchCommand({
          appId,
          branchName: branchName,
        }),
      );
    }
  });

  void it('can deploy backend', async () => {
    const deploymentJob = await startOrGetDeploymentJob(
      appId,
      branchName,
      commitSha,
    );
    jobId = deploymentJob.jobId;
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
  assert.fail(`Job ${jobId} did not succeed within ${timeoutMs} timeout.`);
};

const startOrGetDeploymentJob = async (
  appId: string,
  branchName: string,
  commitSha: string,
): Promise<JobSummary> => {
  /**
   * The logic below is attempting to utilize build queue for single branch as efficiently as possible.
   * Hosting can have only one build in flight for a single branch.
   * Because we have to use pre-created apps with real branches connected this behavior becomes
   * the bottleneck for this test.
   * The trade-offs made here:
   * 1. A single branch build can take up to ~10 minutes. Any build for given commit sha
   *    that completes within that period counts as success regardless of which workflow run triggered it.
   *    This should be rare as full workflow runs with e2e tests take more than 10 minutes.
   *    However, it will protect us in case multiple instances of workflows are triggered
   *    (subsequent commits or operator restarting workflows).
   *    This still allows us to always obtain somewhat fresh validation that hosting builds work (up to 10 minutes delay).
   * 2. In case that there is a build in flight for different commit sha, we let it finish
   *    by re-trying attempt to create new job. We're not deleting job inflight because:
   *    1. CFN deployments will finish asynchronously even if we delete the job, we would risk race conditions.
   *    2. A workflow run deleting jobs that belong to previous workflow run is surprising and might be hard to debug.
   *
   * These choices should be evaluated and adjusted if data from runs proves them being ineffective.
   */
  return runWithRetry(
    async () => {
      const existingJobs = await listJobs(appId, branchName);
      // Find existing job that's either successful or is in progress first that belongs to the commit.
      const existingJob = existingJobs.find((item) => {
        return (
          item.commitId === commitSha &&
          (item.status === JobStatus.RUNNING ||
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
  const staleDurationInMilliseconds = 24 * 60 * 60 * 1000; // 1 day in milliseconds
  const listBranchesResult = await amplifyClient.send(
    new ListBranchesCommand({
      appId,
      maxResults: 50,
    }),
  );

  for (const branch of listBranchesResult.branches ?? []) {
    if (
      branch.updateTime &&
      Date.now() - branch.updateTime.getTime() > staleDurationInMilliseconds &&
      // skip main, we want to always retain it. See comment in 'after' hook above for more details.
      branch.branchName !== 'main'
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

const findTestingAppId = async (executionRoleArn: string): Promise<string> => {
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
      await ensureAppIsConfiguredProperly(testApp, executionRoleArn);
      return testApp.appId;
    }
  } while (listAppsResult.nextToken);

  assert.fail(
    `App named '${testAppName}' is missing in test account and region.`,
  );
};

const ensureAppIsConfiguredProperly = async (
  app: App,
  executionRoleArn: string,
) => {
  assert.ok(
    app.repository?.includes('amplify-backend'),
    'App must be connected to amplify-backend repository, either main repo or fork',
  );
  assert.ok(app.appArn);
  await amplifyClient.send(
    new UpdateAppCommand({
      ...app,
      buildSpec: buildSpec,
      iamServiceRoleArn: executionRoleArn,
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

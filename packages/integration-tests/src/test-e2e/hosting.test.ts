import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'assert';
import {
  AmplifyClient,
  CreateAppCommand,
  CreateBranchCommand,
  CreateDeploymentCommand,
  DeleteBranchCommand,
  JobStatus,
  JobSummary,
  GetBranchCommand,
  GetJobCommand,
  LimitExceededException,
  ListJobsCommand,
  ListJobsCommandOutput,
  ListBranchesCommand,
  NotFoundException,
  StartDeploymentCommand,
  StartJobCommand,
  StopJobCommand,
  UpdateAppCommand,
  UpdateBranchCommand,
} from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { runWithRetry } from '../retry.js';

const amplifyClient = new AmplifyClient({
  ...e2eToolingClientConfig,
  maxAttempts: 5,
});

void describe('hosting', () => {
  let appId: string;
  let branchName: string;
  let commitSha: string;

  before(async () => {
    appId = 'd1z9ikmnr11ttr';
    branchName = 'hosting-test';
    commitSha = '55ba72b95241fcdf9f6e13e5c6614cfee57aaf4b';
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
    assert.ok(jobSummary.status !== 'FAILED');
    assert.ok(jobSummary.status !== 'CANCELLED');
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
 * Note: if we ever hit the limit due to test traffic volume, then we should consider sharding it across
 * couple of predefined apps.
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

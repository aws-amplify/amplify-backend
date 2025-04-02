import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'assert';
import {
  AmplifyClient,
  CreateAppCommand,
  CreateBranchCommand,
  CreateDeploymentCommand,
  DeleteBranchCommand,
  JobStatus,
  GetBranchCommand,
  GetJobCommand,
  ListJobsCommand,
  ListBranchesCommand,
  NotFoundException,
  StartDeploymentCommand,
  StartJobCommand,
  StopJobCommand,
  UpdateAppCommand,
  UpdateBranchCommand,
} from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

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
    //await startDeployment(appId, branchName, commitSha);

    // await amplifyClient.send(
    //   new CreateBranchCommand({
    //     branchName: branchName,
    //     appId: appId,
    //   }),
    // );

    // await amplifyClient.send(
    //   new UpdateAppCommand({
    //     appId: appId,
    //     buildSpec: 'foo',
    //     enableBranchAutoBuild: false,
    //     repository: 'https://github.com/aws-amplify/amplify-backend',
    //     accessToken: process.env.AMPLIFY_BACKEND_TESTS_GITHUB_TOKEN,
    //   }),
    // );

    const jobsList = await amplifyClient.send(
      new ListJobsCommand({
        appId,
        branchName,
        maxResults: 50,
      }),
    );

    //console.log(JSON.stringify(jobsList, null, 2));

    for (const jobSummary of jobsList.jobSummaries ?? []) {
      const job = await amplifyClient.send(
        new GetJobCommand({
          appId,
          branchName,
          jobId: jobSummary.jobId,
        }),
      );
      //console.log(JSON.stringify(job, null, 2));
    }

    // for (const jobSummary of jobsList.jobSummaries ?? []) {
    //   if (jobSummary.status === JobStatus.CREATED)
    //     await amplifyClient.send(
    //       new StopJobCommand({
    //         appId,
    //         branchName,
    //         jobId: jobSummary.jobId,
    //       }),
    //     );
    // }

    // await amplifyClient.send(
    //   new StartJobCommand({
    //     appId: appId,
    //     branchName,
    //     jobType: 'MANUAL',
    //     commitId: '1dccf9e09e3aec18041b0071528feab67275ea07',
    //   }),
    // );

    // const deployment = await amplifyClient.send(
    //   new CreateDeploymentCommand({
    //     appId: appId,
    //     branchName,
    //   }),
    // );

    // await amplifyClient.send(
    //   new StartDeploymentCommand({
    //     appId: appId,
    //     branchName,
    //     // jobId: deployment.jobId,
    //     sourceUrl: `s3://${bucketName}/content/`,
    //     sourceUrlType: 'BUCKET_PREFIX',
    //   }),
    // );
  });
});

const startDeployment = async (
  appId: string,
  branchName: string,
  commitSha: string,
) => {
  await amplifyClient.send(
    new StartJobCommand({
      appId,
      branchName,
      commitId: commitSha,
      jobType: 'RELEASE',
    }),
  );
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
    const branch = getBranchResult.branch;
    if (getBranchResult.branch.enableAutoBuild) {
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

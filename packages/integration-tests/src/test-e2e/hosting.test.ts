import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'assert';
import {
  AmplifyClient,
  CreateAppCommand,
  CreateBranchCommand,
  CreateDeploymentCommand,
  JobStatus,
  GetBranchCommand,
  GetJobCommand,
  ListJobsCommand,
  StartDeploymentCommand,
  StartJobCommand,
  StopJobCommand,
  UpdateAppCommand,
} from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

const amplifyClient = new AmplifyClient({
  ...e2eToolingClientConfig,
  maxAttempts: 5,
});

void describe('hosting', () => {
  void it('can deploy backend', async () => {
    const appId = 'd1z9ikmnr11ttr';
    const branchName = 'hosting-test';

    const branch = await amplifyClient.send(
      new GetBranchCommand({
        branchName: branchName,
        appId: appId,
      }),
    );

    console.log(JSON.stringify(branch, null, 2));

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

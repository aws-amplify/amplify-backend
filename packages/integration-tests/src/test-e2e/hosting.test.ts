import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'assert';
import {
  AmplifyClient,
  CreateAppCommand,
  CreateBranchCommand,
  CreateDeploymentCommand,
  JobStatus,
  ListJobsCommand,
  StartDeploymentCommand,
  StartJobCommand,
  StopJobCommand,
  UpdateAppCommand,
} from '@aws-sdk/client-amplify';
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { shortUuid } from '../short_uuid.js';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { amplifyHostingAppPool } from '../amplify_app_pool.js';

const amplifyClient = new AmplifyClient({
  ...e2eToolingClientConfig,
  maxAttempts: 5,
});

void describe('hosting', () => {
  after(async () => {});

  void it('can deploy backend', async () => {
    const app = await amplifyHostingAppPool.getAppWithCapacity();

    const appId = app.appId;
    const branchName = 'testBranch';

    // await amplifyClient.send(
    //   new CreateBranchCommand({
    //     branchName: branchName,
    //     appId: appId,
    //   }),
    // );

    await amplifyClient.send(
      new UpdateAppCommand({
        appId: appId,
        buildSpec: 'foo',
        enableBranchAutoBuild: false,
        repository: 'https://github.com/aws-amplify/amplify-backend',
        accessToken: process.env.AMPLIFY_BACKEND_TESTS_GITHUB_TOKEN,
      }),
    );

    const jobsList = await amplifyClient.send(
      new ListJobsCommand({
        appId,
        branchName,
        maxResults: 50,
      }),
    );

    for (const jobSummary of jobsList.jobSummaries ?? []) {
      if (jobSummary.status === JobStatus.CREATED)
        await amplifyClient.send(
          new StopJobCommand({
            appId,
            branchName,
            jobId: jobSummary.jobId,
          }),
        );
    }

    await amplifyClient.send(
      new StartJobCommand({
        appId: appId,
        branchName,
        jobType: 'MANUAL',
      }),
    );

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

import { after, before, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
} from '../setup_test_directory.js';
import { fileURLToPath } from 'node:url';
import { testConcurrencyLevel } from './test_concurrency.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { TestProjectBase } from '../test-project-setup/test_project_base.js';
import {
  amplifySharedSecretNameKey,
  createAmplifySharedSecretName,
} from '../shared_secret.js';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { IAMClient } from '@aws-sdk/client-iam';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { DataStorageAuthWithTriggerTestProjectCreator } from '../test-project-setup/data_storage_auth_with_triggers.js';
import { setupDeployedBackendClient } from '../test-project-setup/setup_deployed_backend_client.js';
import { CloudTrailClient } from '@aws-sdk/client-cloudtrail';

/**
 * This E2E test is to check whether current (aka latest) repository content introduces breaking changes
 * for our deployed backend client to read outputs.
 */

// Different root test dir to avoid race conditions with e2e deployment tests
const rootTestDir = fileURLToPath(
  new URL('../e2e-outputs-tests', import.meta.url)
);

void describe(
  'backend output tests',
  { concurrency: testConcurrencyLevel },
  () => {
    const cfnClient = new CloudFormationClient(e2eToolingClientConfig);
    const cloudTrailClient = new CloudTrailClient(e2eToolingClientConfig);
    const amplifyClient = new AmplifyClient(e2eToolingClientConfig);
    const secretClient = getSecretClient(e2eToolingClientConfig);
    const lambdaClient = new LambdaClient(e2eToolingClientConfig);
    const s3Client = new S3Client(e2eToolingClientConfig);
    const iamClient = new IAMClient(e2eToolingClientConfig);
    const resourceFinder = new DeployedResourcesFinder(cfnClient);
    const dataStorageAuthWithTriggerTestProjectCreator =
      new DataStorageAuthWithTriggerTestProjectCreator(
        cfnClient,
        amplifyClient,
        secretClient,
        lambdaClient,
        s3Client,
        iamClient,
        cloudTrailClient,
        resourceFinder
      );

    let branchBackendIdentifier: BackendIdentifier;
    let testBranch: TestBranch;
    let testProject: TestProjectBase;

    before(async () => {
      await createTestDirectory(rootTestDir);
      testProject =
        await dataStorageAuthWithTriggerTestProjectCreator.createProject(
          rootTestDir
        );
      await setupDeployedBackendClient(testProject.projectDirPath);
      testBranch = await amplifyAppPool.createTestBranch();
      branchBackendIdentifier = {
        namespace: testBranch.appId,
        name: testBranch.branchName,
        type: 'branch',
      };
    });
    after(async () => {
      await testProject.tearDown(branchBackendIdentifier);
      await deleteTestDirectory(rootTestDir);
    });

    void it('deploys fully and stack outputs are readable by backend client', async () => {
      const sharedSecretsEnv = {
        [amplifySharedSecretNameKey]: createAmplifySharedSecretName(),
      };

      await testProject.deploy(branchBackendIdentifier, sharedSecretsEnv);
      await testProject.assertPostDeployment(branchBackendIdentifier);
      await testProject.assertDeployedClientOutputs(branchBackendIdentifier);
    });
  }
);

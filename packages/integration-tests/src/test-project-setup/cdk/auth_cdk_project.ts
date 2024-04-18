import {
  TestCdkProjectCreator,
  testCdkProjectsSourceRoot,
} from './test_cdk_project_creator.js';
import { TestCdkProjectBase } from './test_cdk_project_base.js';
import { createEmptyCdkProject } from './create_empty_cdk_project.js';
import fs from 'fs/promises';
import path from 'path';
import { DeployedResourcesFinder } from '../../find_deployed_resource.js';
import assert from 'node:assert';
import { generateClientConfig } from '@aws-amplify/client-config';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

/**
 * Creates a CDK project with auth construct
 */
export class AuthTestCdkProjectCreator implements TestCdkProjectCreator {
  readonly name = 'auth-cdk';

  /**
   * Constructor.
   */
  constructor(private readonly resourceFinder: DeployedResourcesFinder) {}

  createProject = async (
    e2eProjectDir: string
  ): Promise<TestCdkProjectBase> => {
    const { projectName, projectRoot } = await createEmptyCdkProject(
      this.name,
      e2eProjectDir
    );

    const sourceProjectDirPath = path.resolve(
      testCdkProjectsSourceRoot,
      this.name
    );
    await fs.cp(sourceProjectDirPath, path.join(projectRoot, 'lib'), {
      recursive: true,
    });

    return new AuthTestCdkProject(
      projectName,
      projectRoot,
      this.resourceFinder
    );
  };
}

class AuthTestCdkProject extends TestCdkProjectBase {
  constructor(
    readonly name: string,
    readonly projectDirPath: string,
    private readonly resourceFinder: DeployedResourcesFinder
  ) {
    super(name, projectDirPath);
  }
  assertPostDeployment = async (): Promise<void> => {
    // assert has some of expected resources
    const userPools = await this.resourceFinder.findByStackName(
      this.stackName,
      'AWS::Cognito::UserPool'
    );
    assert.equal(userPools.length, 1);

    const s3Client = new S3Client();
    const amplifyClient = new AmplifyClient();
    const cloudFormationClient = new CloudFormationClient();

    const awsClientProvider = {
      getS3Client: () => s3Client,
      getAmplifyClient: () => amplifyClient,
      getCloudFormationClient: () => cloudFormationClient,
    };
    // assert that we can generate client config
    const clientConfig = await generateClientConfig(
      {
        stackName: this.stackName,
      },
      '1', //version of the config
      awsClientProvider
    );

    assert.ok(
      clientConfig.auth?.user_pool_id,
      'client config should include user pool'
    );
  };
}

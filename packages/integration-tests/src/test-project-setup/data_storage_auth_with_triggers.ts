import fs from 'fs/promises';
import { SecretClient } from '@aws-amplify/backend-secret';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectBase, TestProjectUpdate } from './test_project_base.js';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import { TestProjectCreator } from './test_project_creator.js';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import assert from 'node:assert';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import {
  amplifySharedSecretNameKey,
  createAmplifySharedSecretName,
} from '../shared_secret.js';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { GetRoleCommand, IAMClient } from '@aws-sdk/client-iam';

/**
 * Creates test projects with data, storage, and auth categories.
 */
export class DataStorageAuthWithTriggerTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'data-storage-auth';

  /**
   * Creates project creator.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient,
    private readonly secretClient: SecretClient,
    private readonly lambdaClient: LambdaClient,
    private readonly s3Client: S3Client,
    private readonly iamClient: IAMClient,
    private readonly resourceFinder: DeployedResourcesFinder
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const {
      projectName,
      projectRoot,
      projectAmplifyDir,
      projectDotAmplifyDir,
    } = await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new DataStorageAuthWithTriggerTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.secretClient,
      this.lambdaClient,
      this.s3Client,
      this.iamClient,
      this.resourceFinder
    );
    await fs.cp(
      project.sourceProjectAmplifyDirPath,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      }
    );

    // copy .amplify folder with typedef file from source project
    await fs.cp(project.sourceProjectDotAmplifyDirPath, projectDotAmplifyDir, {
      recursive: true,
    });

    return project;
  };
}

/**
 * Test project with data, storage, and auth categories.
 */
class DataStorageAuthWithTriggerTestProject extends TestProjectBase {
  // Note that this is pointing to the non-compiled project directory
  // This allows us to test that we are able to deploy js, cjs, ts, etc without compiling with tsc first
  readonly sourceProjectDirPath =
    '../../src/test-projects/data-storage-auth-with-triggers-ts';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirPath: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url
  );

  readonly sourceProjectDotAmplifyDirSuffix = `${this.sourceProjectDirPath}/.amplify`;

  readonly sourceProjectDotAmplifyDirPath: URL = new URL(
    this.sourceProjectDotAmplifyDirSuffix,
    import.meta.url
  );

  private readonly sourceProjectUpdateDirPath: URL = new URL(
    `${this.sourceProjectDirPath}/update-1`,
    import.meta.url
  );

  private readonly dataResourceFileSuffix = 'data/resource.ts';

  private readonly testSecretNames = [
    'googleId',
    'googleSecret',
    'facebookId',
    'facebookSecret',
    'amazonId',
    'amazonSecret',
  ];

  private amplifySharedSecret: string;

  private testBucketName: string;
  private testRoleNames: string[];

  /**
   * Create a test project instance.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    private readonly secretClient: SecretClient,
    private readonly lambdaClient: LambdaClient,
    private readonly s3Client: S3Client,
    private readonly iamClient: IAMClient,
    private readonly resourceFinder: DeployedResourcesFinder
  ) {
    super(name, projectDirPath, projectAmplifyDirPath, cfnClient);
  }

  /**
   * @inheritdoc
   */
  override async deploy(
    backendIdentifier: BackendIdentifier,
    environment: Record<string, string> = {}
  ) {
    this.amplifySharedSecret =
      amplifySharedSecretNameKey in environment
        ? environment[amplifySharedSecretNameKey]
        : createAmplifySharedSecretName();
    const sharedSecretEnvObject = {
      [amplifySharedSecretNameKey]: this.amplifySharedSecret,
    };
    await this.setUpDeployEnvironment(backendIdentifier);
    await super.deploy(backendIdentifier, sharedSecretEnvObject);
  }

  /**
   * @inheritdoc
   */
  override async tearDown(backendIdentifier: BackendIdentifier) {
    await super.tearDown(backendIdentifier);
    await this.clearDeployEnvironment(backendIdentifier);
    await this.assertExpectedCleanup();
  }

  /**
   * @inheritdoc
   */
  override async getUpdates(): Promise<TestProjectUpdate[]> {
    const sourceDataResourceFile = pathToFileURL(
      path.join(
        fileURLToPath(this.sourceProjectUpdateDirPath),
        this.dataResourceFileSuffix
      )
    );
    const dataResourceFile = pathToFileURL(
      path.join(this.projectAmplifyDirPath, this.dataResourceFileSuffix)
    );
    return [
      {
        sourceFile: sourceDataResourceFile,
        projectFile: dataResourceFile,
        deployThresholdSec: {
          onWindows: 40,
          onOther: 30,
        },
      },
    ];
  }

  override async assertPostDeployment(
    backendId: BackendIdentifier
  ): Promise<void> {
    await super.assertPostDeployment(backendId);
    // Check that deployed lambda is working correctly

    // find lambda function
    const defaultNodeLambda = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Lambda::Function',
      (name) => name.includes('defaultNodeFunction')
    );

    const node16Lambda = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Lambda::Function',
      (name) => name.includes('node16Function')
    );

    assert.equal(defaultNodeLambda.length, 1);
    assert.equal(node16Lambda.length, 1);

    const expectedResponse = {
      s3TestContent: 'this is some test content',
      testSecret: 'amazonSecret-e2eTestValue',
      testSharedSecret: `${this.amplifySharedSecret}-e2eTestSharedValue`,
    };

    await this.checkLambdaResponse(defaultNodeLambda[0], expectedResponse);
    await this.checkLambdaResponse(node16Lambda[0], expectedResponse);

    const bucketName = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::S3::Bucket',
      // eslint-disable-next-line spellcheck/spell-checker
      (bucketName) => bucketName.includes('testnamebucket')
    );
    assert.equal(
      bucketName.length,
      1,
      `Expected one test bucket but found ${JSON.stringify(bucketName)}`
    );
    // store the bucket name in the class so we can assert that it is deleted properly when the stack is torn down
    this.testBucketName = bucketName[0];

    // store the roles associated with this deployment so we can assert that they are deleted when the stack is torn down
    this.testRoleNames = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::IAM::Role'
    );
  }

  private setUpDeployEnvironment = async (
    backendId: BackendIdentifier
  ): Promise<void> => {
    for (const secretName of this.testSecretNames) {
      const secretValue = `${secretName}-e2eTestValue`;
      await this.secretClient.setSecret(backendId, secretName, secretValue);
    }
    const secretValue = `${this.amplifySharedSecret}-e2eTestSharedValue`;
    await this.secretClient.setSecret(
      backendId.namespace,
      this.amplifySharedSecret,
      secretValue
    );
  };

  private clearDeployEnvironment = async (
    backendId: BackendIdentifier
  ): Promise<void> => {
    // clear secrets
    for (const secretName of this.testSecretNames) {
      await this.secretClient.removeSecret(backendId, secretName);
    }
    await this.secretClient.removeSecret(
      backendId.namespace,
      this.amplifySharedSecret
    );
  };

  private checkLambdaResponse = async (
    lambdaName: string,
    expectedResponse: unknown
  ) => {
    // invoke the lambda
    const response = await this.lambdaClient.send(
      new InvokeCommand({ FunctionName: lambdaName })
    );
    const responsePayload = JSON.parse(
      response.Payload?.transformToString() || ''
    );

    // check expected response
    assert.deepStrictEqual(responsePayload, expectedResponse);
  };

  private assertExpectedCleanup = async () => {
    await this.waitForBucketDeletion(this.testBucketName);
    await this.assertRolesDoNotExist(this.testRoleNames);
  };

  /**
   * There is some eventual consistency between deleting a bucket and when HeadBucket returns NotFound
   * So we are polling HeadBucket until it returns NotFound or until we time out (after 30 seconds)
   */
  private waitForBucketDeletion = async (bucketName: string): Promise<void> => {
    const TIMEOUT_MS = 1000 * 30; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < TIMEOUT_MS) {
      const bucketExists = await this.checkBucketExists(bucketName);
      if (!bucketExists) {
        // bucket has been deleted
        return;
      }
      // wait a second before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.fail(`Timed out waiting for ${bucketName} to be deleted`);
  };

  private checkBucketExists = async (bucketName: string): Promise<boolean> => {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      // if HeadBucket returns without error, the bucket exists and is accessible
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === 'NotFound') {
        return false;
      }
      throw err;
    }
  };

  private assertRolesDoNotExist = async (roleNames: string[]) => {
    for (const roleName of roleNames) {
      await assert.rejects(
        () => this.iamClient.send(new GetRoleCommand({ RoleName: roleName })),
        {
          name: 'NoSuchEntity',
        }
      );
    }
  };
}

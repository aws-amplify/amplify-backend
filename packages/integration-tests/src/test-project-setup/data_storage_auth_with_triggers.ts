import fs from 'fs/promises';
import { SecretClient, getSecretClient } from '@aws-amplify/backend-secret';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectBase, TestProjectUpdate } from './test_project_base.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'path';
import { TestProjectCreator } from './test_project_creator.js';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import assert from 'node:assert';
import {
  GetFunctionCommand,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import {
  amplifySharedSecretNameKey,
  createAmplifySharedSecretName,
} from '../shared_secret.js';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { GetRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import {
  CloudTrailClient,
  LookupEventsCommand,
} from '@aws-sdk/client-cloudtrail';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import isMatch from 'lodash.ismatch';
import { TextWriter, ZipReader } from '@zip.js/zip.js';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

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
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig
    ),
    private readonly secretClient: SecretClient = getSecretClient(
      e2eToolingClientConfig
    ),
    private readonly lambdaClient: LambdaClient = new LambdaClient(
      e2eToolingClientConfig
    ),
    private readonly s3Client: S3Client = new S3Client(e2eToolingClientConfig),
    private readonly iamClient: IAMClient = new IAMClient(
      e2eToolingClientConfig
    ),
    private readonly sqsClient: SQSClient = new SQSClient(
      e2eToolingClientConfig
    ),
    private readonly cloudTrailClient: CloudTrailClient = new CloudTrailClient(
      e2eToolingClientConfig
    ),
    private readonly resourceFinder: DeployedResourcesFinder = new DeployedResourcesFinder(),
    private readonly cognitoClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
      e2eToolingClientConfig
    )
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new DataStorageAuthWithTriggerTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.secretClient,
      this.lambdaClient,
      this.s3Client,
      this.iamClient,
      this.sqsClient,
      this.cloudTrailClient,
      this.resourceFinder,
      this.cognitoClient
    );
    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      }
    );

    return project;
  };
}

/**
 * Test project with data, storage, and auth categories.
 */
class DataStorageAuthWithTriggerTestProject extends TestProjectBase {
  // Note that this is pointing to the non-compiled project directory
  // This allows us to test that we are able to deploy js, cjs, ts, etc without compiling with tsc first
  readonly sourceProjectRootPath =
    '../../src/test-projects/data-storage-auth-with-triggers-ts';

  readonly sourceProjectRootURL: URL = new URL(
    this.sourceProjectRootPath,
    import.meta.url
  );

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    `${this.sourceProjectRootPath}/amplify`,
    import.meta.url
  );

  private readonly sourceProjectUpdateDirURL: URL = new URL(
    `${this.sourceProjectRootPath}/hotswap-update-files`,
    import.meta.url
  );

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
    amplifyClient: AmplifyClient,
    private readonly secretClient: SecretClient,
    private readonly lambdaClient: LambdaClient,
    private readonly s3Client: S3Client,
    private readonly iamClient: IAMClient,
    private readonly sqsClient: SQSClient,
    private readonly cloudTrailClient: CloudTrailClient,
    private readonly resourceFinder: DeployedResourcesFinder,
    private readonly cognitoClient: CognitoIdentityProviderClient
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient
    );
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
    const { region } = e2eToolingClientConfig;
    const env: Record<string, string> = {
      [amplifySharedSecretNameKey]: this.amplifySharedSecret,
    };
    if (region) {
      env.AWS_REGION = region;
    }

    await this.setUpDeployEnvironment(backendIdentifier);
    await super.deploy(backendIdentifier, env);
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
    return [
      {
        replacements: [this.getUpdateReplacementDefinition('data/resource.ts')],
        deployThresholdSec: {
          onWindows: 40,
          onOther: 30,
        },
      },
      {
        replacements: [
          this.getUpdateReplacementDefinition('func-src/handler.ts'),
          this.getUpdateReplacementDefinition('function.ts'),
        ],
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

    const funcWithSsm = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Lambda::Function',
      (name) => name.includes('funcWithSsm')
    );

    const funcWithAwsSdk = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Lambda::Function',
      (name) => name.includes('funcWithAwsSdk')
    );

    const funcWithSchedule = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Lambda::Function',
      (name) => name.includes('funcWithSchedule')
    );

    const funcNoMinify = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Lambda::Function',
      (name) => name.includes('funcNoMinify')
    );
    const funcCustomEmailSender =
      await this.resourceFinder.findByBackendIdentifier(
        backendId,
        'AWS::Lambda::Function',
        (name) => name.includes('funcCustomEmailSender')
      );

    assert.equal(defaultNodeLambda.length, 1);
    assert.equal(node16Lambda.length, 1);
    assert.equal(funcWithSsm.length, 1);
    assert.equal(funcWithAwsSdk.length, 1);
    assert.equal(funcWithSchedule.length, 1);
    assert.equal(funcCustomEmailSender.length, 1);

    const expectedResponse = {
      s3TestContent: 'this is some test content',
      testSecret: 'amazonSecret-e2eTestValue',
      testSharedSecret: `${this.amplifySharedSecret}-e2eTestSharedValue`,
      testNodeAddon: '[object Object]', // just need to test dependency returns key pair object
    };

    await this.checkLambdaResponse(defaultNodeLambda[0], expectedResponse);
    await this.checkLambdaResponse(node16Lambda[0], expectedResponse);
    await this.checkLambdaResponse(funcWithSsm[0], 'It is working');

    // Custom email sender assertion
    await this.assertCustomEmailSenderWorks(backendId);

    await this.assertScheduleInvokesFunction(backendId);

    const expectedNoMinifyChunk = [
      'var handler = async () => {',
      '  return "No minify";',
      '};',
    ].join('\n');
    await this.checkLambdaCode(funcNoMinify[0], expectedNoMinifyChunk);

    const bucketName = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::S3::Bucket',
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

    // ensure typed shim files are generated by checking for onDelete's typed shim
    assert.ok(
      (
        await fs.stat(
          path.join(
            this.projectDirPath,
            '.amplify',
            'generated',
            'env',
            'onDelete.ts'
          )
        )
      ).isFile()
    );

    // ensure that all environment variables are present in the typed shim file for defaultNodeLambda function
    const defaultNodeLambdaTypedShimPath = path.join(
      this.projectDirPath,
      '.amplify',
      'generated',
      'env',
      'defaultNodeFunction.ts'
    );
    const fileContent = await fs.readFile(
      defaultNodeLambdaTypedShimPath,
      'utf8'
    );
    assert.ok(fileContent.includes('newKey: string;')); // Env var added via addEnvironment
    assert.ok(fileContent.includes('TEST_SECRET: string;')); // Env var added via defineFunction

    // assert specific config are correct in the outputs file
    const outputsObject = JSON.parse(
      await fs.readFile(
        path.join(this.projectDirPath, 'amplify_outputs.json'),
        'utf-8'
      )
    );
    assert.ok(
      isMatch(outputsObject.storage.buckets[0].paths, {
        'public/*': {
          guest: ['get', 'list'],
          authenticated: ['get', 'list', 'write'],
          groupsAdmins: ['get', 'list', 'write', 'delete'],
        },
        'protected/*': {
          authenticated: ['get', 'list'],
          groupsAdmins: ['get', 'list', 'write', 'delete'],
        },
        'protected/${cognito-identity.amazonaws.com:sub}/*': {
          // eslint-disable-next-line spellcheck/spell-checker
          entityidentity: ['get', 'list', 'write', 'delete'],
        },
      })
    );

    assert.ok(
      isMatch(outputsObject.auth.groups, [
        {
          Editors: {
            precedence: 2, // previously 0 but was overwritten
          },
        },
        {
          Admins: {
            precedence: 1,
          },
        },
      ])
    );
  }

  private getUpdateReplacementDefinition = (suffix: string) => ({
    source: this.getSourceProjectUpdatePath(suffix),
    destination: this.getTestProjectPath(suffix),
  });

  private getSourceProjectUpdatePath = (suffix: string) =>
    pathToFileURL(
      path.join(fileURLToPath(this.sourceProjectUpdateDirURL), suffix)
    );

  private getTestProjectPath = (suffix: string) =>
    pathToFileURL(path.join(this.projectAmplifyDirPath, suffix));

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

  private checkLambdaCode = async (
    lambdaName: string,
    expectedCode: string
  ) => {
    // get the lambda code
    const response = await this.lambdaClient.send(
      new GetFunctionCommand({ FunctionName: lambdaName })
    );
    const codeUrl = response.Code?.Location;
    assert(codeUrl !== undefined);
    const fetchResponse = await fetch(codeUrl);
    const zipReader = new ZipReader(fetchResponse.body!);
    const entries = await zipReader.getEntries();
    const entry = entries.find((entry) => entry.filename.endsWith('index.mjs'));
    assert(entry !== undefined);
    const sourceCode = await entry.getData!(new TextWriter());
    assert(sourceCode.includes(expectedCode));
  };

  private assertExpectedCleanup = async () => {
    await this.waitForBucketDeletion(this.testBucketName);
    await this.assertRolesDoNotExist(this.testRoleNames);
  };

  /**
   * There is some eventual consistency between deleting a bucket and when HeadBucket returns NotFound
   * So we are polling HeadBucket and CloudTrail events
   * until it returns NotFound or until we time out (after 3 minutes)
   */
  private waitForBucketDeletion = async (bucketName: string): Promise<void> => {
    // Poll for 3 minutes.
    // If HeadBucket doesn't become eventually consistent then
    // there's at least pretty good chance that BucketDelete event
    // managed to arrive at CloudTrail.
    const TIMEOUT_MS = 1000 * 60 * 3;
    const startTime = Date.now();

    let elapsedTimeMs = 0;
    let pollingIntervalMs = 1000;
    do {
      const bucketExists = await this.checkBucketExists(bucketName);
      if (!bucketExists) {
        // bucket has been deleted
        return;
      }
      // Start querying Cloud Trail after a minute.
      // So that we don't burn down request quota unnecessarily.
      if (elapsedTimeMs >= 1000 * 60) {
        // Bump polling interval to wait 10 seconds before polling again.
        // Cloud trail has low TPS quota.
        pollingIntervalMs = 10000;
        const deleteBucketEventArrived =
          await this.checkIfDeleteBucketEventArrived(bucketName);
        if (deleteBucketEventArrived) {
          // bucket has been deleted
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
      elapsedTimeMs = Date.now() - startTime;
    } while (elapsedTimeMs < TIMEOUT_MS);
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

  private checkIfDeleteBucketEventArrived = async (
    bucketName: string
  ): Promise<boolean> => {
    try {
      const lookupEventsResponse = await this.cloudTrailClient.send(
        new LookupEventsCommand({
          LookupAttributes: [
            {
              AttributeKey: 'EventName',
              AttributeValue: 'DeleteBucket',
            },
            {
              AttributeKey: 'ResourceType',
              AttributeValue: 'AWS::S3::Bucket',
            },
            {
              AttributeKey: 'ResourceName',
              AttributeValue: bucketName,
            },
          ],
        })
      );
      return (lookupEventsResponse.Events?.length ?? 0) > 0;
    } catch (err) {
      if (err instanceof Error && err.name === 'ThrottlingException') {
        // This is a best effort check.
        // If we get throttled pretend that we haven't seen event yet.
        return false;
      }
      throw err;
    }
  };

  private assertRolesDoNotExist = async (roleNames: string[]) => {
    const TIMEOUT_MS = 1000 * 60 * 5; // IAM Role stabilization can take up to 2 minutes and we are waiting in between each GetRole call to avoid throttling
    const startTime = Date.now();

    const remainingRoles = new Set(roleNames);

    while (Date.now() - startTime < TIMEOUT_MS && remainingRoles.size > 0) {
      // iterate over a copy of the roles set to avoid confusing concurrent modification behavior
      for (const roleName of Array.from(remainingRoles)) {
        try {
          const roleExists = await this.checkRoleExists(roleName);
          if (!roleExists) {
            remainingRoles.delete(roleName);
          }
        } catch (err) {
          if (err instanceof Error) {
            console.log(
              `Got error [${err.name}] while polling for deletion of [${roleName}].`
            );
          }
          // continue polling
        }

        // wait a bit between each call to help avoid throttling
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    if (remainingRoles.size > 0) {
      assert.fail(
        `Timed out waiting for role deletion. Remaining roles were [${Array.from(
          remainingRoles
        ).join(', ')}]`
      );
    }
    // if we got here all the roles were cleaned up within the timeout
  };

  private checkRoleExists = async (roleName: string): Promise<boolean> => {
    try {
      await this.iamClient.send(new GetRoleCommand({ RoleName: roleName }));
      // if GetRole returns without error, the role exits
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === 'NoSuchEntityException') {
        return false;
      }
      throw err;
    }
  };

  private assertScheduleInvokesFunction = async (
    backendId: BackendIdentifier
  ) => {
    const TIMEOUT_MS = 1000 * 60 * 2; // 2 minutes
    const startTime = Date.now();
    let receivedMessageCount = 0;

    const queue = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::SQS::Queue',
      (name) => name.includes('testFuncQueue')
    );

    // wait for schedule to invoke the function one time for it to send a message
    while (Date.now() - startTime < TIMEOUT_MS) {
      const response = await this.sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: queue[0],
          WaitTimeSeconds: 20,
          MaxNumberOfMessages: 10,
        })
      );

      if (response.Messages) {
        receivedMessageCount += response.Messages.length;

        // delete messages afterwards
        for (const message of response.Messages) {
          await this.sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: queue[0],
              ReceiptHandle: message.ReceiptHandle,
            })
          );
        }
      }
    }

    if (receivedMessageCount === 0) {
      assert.fail(
        `The scheduled function failed to invoke and send a message to the queue.`
      );
    }
  };

  private assertCustomEmailSenderWorks = async (
    backendId: BackendIdentifier
  ) => {
    const TIMEOUT_MS = 1000 * 60 * 2; // 2 minutes
    const startTime = Date.now();
    const queue = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::SQS::Queue',
      (name) => name.includes('customEmailSenderQueue')
    );

    assert.strictEqual(queue.length, 1, 'Custom email sender queue not found');

    // Trigger an email sending operation
    await this.triggerEmailSending(backendId);

    // Wait for the SQS message
    let messageReceived = false;
    while (Date.now() - startTime < TIMEOUT_MS && !messageReceived) {
      const response = await this.sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: queue[0],
          WaitTimeSeconds: 20,
        })
      );

      if (response.Messages && response.Messages.length > 0) {
        messageReceived = true;
        // Verify the message content
        const messageBody = JSON.parse(response.Messages[0].Body || '{}');
        assert.strictEqual(
          messageBody.message,
          'Custom Email Sender is working',
          'Unexpected message content'
        );

        // Delete the message
        await this.sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: queue[0],
            ReceiptHandle: response.Messages[0].ReceiptHandle!,
          })
        );
      }
    }

    assert.strictEqual(
      messageReceived,
      true,
      'Custom email sender was not triggered within the timeout period'
    );
  };

  private triggerEmailSending = async (backendId: BackendIdentifier) => {
    const userPoolId = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Cognito::UserPool',
      () => true
    );

    assert.strictEqual(userPoolId.length, 1, 'User pool not found');

    const username = `testuser_${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await this.cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId[0],
        Username: username,
        TemporaryPassword: password,
        UserAttributes: [
          { Name: 'email', Value: username },
          { Name: 'email_verified', Value: 'true' },
        ],
      })
    );
    // The creation of a new user should trigger the custom email sender
  };
}

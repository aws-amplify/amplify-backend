import fs from 'fs/promises';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectBase } from './test_project_base.js';
import { TestProjectCreator } from './test_project_creator.js';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import assert from 'node:assert';
import {
  GetFunctionCommand,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { TextWriter, ZipReader } from '@zip.js/zip.js';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * Creates test projects with advanced use cases of auth and functions categories.
 */
export class AdvancedAuthAndFunctionsTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'advanced-auth-and-functions';

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
    private readonly lambdaClient: LambdaClient = new LambdaClient(
      e2eToolingClientConfig
    ),
    private readonly sqsClient: SQSClient = new SQSClient(
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

    const project = new AdvancedAuthAndFunctionsTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.lambdaClient,
      this.sqsClient,
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
 * Test project with advanced use cases of auth and functions categories.
 */
class AdvancedAuthAndFunctionsTestProject extends TestProjectBase {
  readonly sourceProjectRootPath =
    '../../src/test-projects/advanced-auth-and-functions';

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    `${this.sourceProjectRootPath}/amplify`,
    import.meta.url
  );

  /**
   * Create a test project instance.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient,
    private readonly lambdaClient: LambdaClient,
    private readonly sqsClient: SQSClient,
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

  override async assertPostDeployment(
    backendId: BackendIdentifier
  ): Promise<void> {
    await super.assertPostDeployment(backendId);

    // Check that deployed lambdas are working correctly

    // find lambda functions
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

    assert.equal(funcWithSsm.length, 1);
    assert.equal(funcWithAwsSdk.length, 1);
    assert.equal(funcWithSchedule.length, 1);
    assert.equal(funcCustomEmailSender.length, 1);

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
  }

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

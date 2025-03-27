import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { generateClientConfig } from '@aws-amplify/client-config';
import assert from 'assert';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { SecretClient, getSecretClient } from '@aws-amplify/backend-secret';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';

/**
 * Creates test projects with circular dependency between data, and functions
 */
export class CircularDepDataFuncTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'circular-dep-data-func';

  /**
   * Creates project creator.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig,
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig,
    ),
    private readonly secretClient: SecretClient = getSecretClient(
      e2eToolingClientConfig,
    ),
    private readonly lambdaClient: LambdaClient = new LambdaClient(
      e2eToolingClientConfig,
    ),
    private readonly resourceFinder: DeployedResourcesFinder = new DeployedResourcesFinder(),
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new CircularDepDataFuncTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.secretClient,
      this.lambdaClient,
      this.resourceFinder,
    );
    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      },
    );
    return project;
  };
}

/**
 * Test project with circular dependency between data, and functions
 */
class CircularDepDataFuncTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../src/test-projects/circular-dep-data-func';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url,
  );

  private readonly testSecretNames = ['amazonSecret'];

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
    private readonly resourceFinder: DeployedResourcesFinder,
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient,
    );
  }

  override async deploy(
    backendIdentifier: BackendIdentifier,
    environment?: Record<string, string>,
  ): Promise<void> {
    await this.setUpDeployEnvironment(backendIdentifier);
    await super.deploy(backendIdentifier, environment);
  }

  override async tearDown(
    backendIdentifier: BackendIdentifier,
    waitForStackDeletion?: boolean,
  ): Promise<void> {
    await super.tearDown(backendIdentifier, waitForStackDeletion);
    await this.clearDeployEnvironment(backendIdentifier);
  }

  override async assertPostDeployment(
    backendId: BackendIdentifier,
  ): Promise<void> {
    await super.assertPostDeployment(backendId);

    const clientConfig = await generateClientConfig(backendId, '1.1');
    if (!clientConfig.data?.url) {
      throw new Error(
        'Data storage auth with triggers project must include data',
      );
    }
    const dataUrl = clientConfig.data?.url;

    const customAPIFunction = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Lambda::Function',
      (name) => name.includes('customAPIFunction'),
    );

    assert.equal(customAPIFunction.length, 1);

    await this.checkLambdaResponse(customAPIFunction[0], {
      graphqlEndpoint: dataUrl,
      testSecret: 'amazonSecret-e2eTestValue',
    });
  }

  private setUpDeployEnvironment = async (
    backendId: BackendIdentifier,
  ): Promise<void> => {
    for (const secretName of this.testSecretNames) {
      const secretValue = `${secretName}-e2eTestValue`;
      await this.secretClient.setSecret(backendId, secretName, secretValue);
    }
  };

  private clearDeployEnvironment = async (
    backendId: BackendIdentifier,
  ): Promise<void> => {
    // clear secrets
    for (const secretName of this.testSecretNames) {
      await this.secretClient.removeSecret(backendId, secretName);
    }
  };

  private checkLambdaResponse = async (
    lambdaName: string,
    expectedResponse: unknown,
  ) => {
    // invoke the lambda
    const response = await this.lambdaClient.send(
      new InvokeCommand({ FunctionName: lambdaName }),
    );
    const responsePayload = JSON.parse(
      response.Payload?.transformToString() || '',
    );

    // check expected response
    assert.deepStrictEqual(responsePayload, expectedResponse);
  };
}

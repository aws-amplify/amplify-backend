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

type TestConstant = {
  secretNames: {
    [name: string]: string;
  };
};

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
    private readonly resourceFinder: DeployedResourcesFinder
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new DataStorageAuthWithTriggerTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.secretClient,
      this.lambdaClient,
      this.resourceFinder
    );
    await fs.cp(
      project.sourceProjectAmplifyDirPath,
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
  readonly sourceProjectDirPath =
    '../../test-projects/data-storage-auth-with-triggers-ts';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirPath: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url
  );

  private readonly sourceProjectConstantFilePath: string = new URL(
    `${this.sourceProjectAmplifyDirSuffix}/constants.ts`,
    import.meta.url
  ).toString();

  private readonly sourceProjectUpdateDirPath: URL = new URL(
    `${this.sourceProjectDirPath}/update-1`,
    import.meta.url
  );

  private readonly dataResourceFileSuffix = 'data/resource.ts';

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
    private readonly resourceFinder: DeployedResourcesFinder
  ) {
    super(name, projectDirPath, projectAmplifyDirPath, cfnClient);
  }

  /**
   * @inheritdoc
   */
  override async deploy(backendIdentifier: BackendIdentifier) {
    await this.setUpDeployEnvironment(backendIdentifier);
    await super.deploy(backendIdentifier);
  }

  /**
   * @inheritdoc
   */
  override async tearDown(backendIdentifier: BackendIdentifier) {
    await super.tearDown(backendIdentifier);
    await this.clearDeployEnvironment(backendIdentifier);
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
        // windows is consistently slower than other platforms
        deployThresholdSec: process.platform.startsWith('win') ? 40 : 20,
      },
    ];
  }

  override async assertPostDeployment(
    backendId: BackendIdentifier
  ): Promise<void> {
    await super.assertPostDeployment(backendId);

    // Check that deployed lambda is working correctly

    // find lambda function
    const lambdas = await this.resourceFinder.find(
      backendId,
      'AWS::Lambda::Function',
      (name) => name.includes('specialTestFunction')
    );

    assert.equal(lambdas.length, 1);

    // invoke the lambda
    const response = await this.lambdaClient.send(
      new InvokeCommand({ FunctionName: lambdas[0] })
    );
    const responsePayload = JSON.parse(
      response.Payload?.transformToString() || ''
    );

    // check expected response
    assert.equal(
      responsePayload,
      // eslint-disable-next-line spellcheck/spell-checker
      'Your uuid is 6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b'
    );
  }

  private setUpDeployEnvironment = async (
    backendId: BackendIdentifier
  ): Promise<void> => {
    const { secretNames } = (await import(
      this.sourceProjectConstantFilePath
    )) as TestConstant;
    for (const secretField in secretNames) {
      const secretName = secretNames[secretField];
      const secretValue = `${secretName as string}-e2eTestValue`;
      await this.secretClient.setSecret(backendId, secretName, secretValue);
    }
  };

  private clearDeployEnvironment = async (
    backendId: BackendIdentifier
  ): Promise<void> => {
    const { secretNames } = (await import(
      this.sourceProjectConstantFilePath
    )) as TestConstant;
    // clear secrets
    for (const secretField in secretNames) {
      const secretName = secretNames[secretField];
      await this.secretClient.removeSecret(backendId, secretName);
    }
  };
}

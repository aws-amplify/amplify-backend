import { TestProject } from './test_project.js';
import fs from 'fs/promises';
import { SecretClient } from '@aws-amplify/backend-secret';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { createEmptyAmplifyProject } from '../create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectBase } from './test_project_base.js';
import { pathToFileURL } from 'url';
import assert from 'node:assert';
import path from 'path';

/**
 * Test project with data, storage, and auth, categories.
 */
export class DataStorageAuthWithTriggerTestProject extends TestProjectBase {
  private readonly sourceProjectAmplifyDirSuffix =
    '../../test-projects/data-storage-auth-with-triggers/amplify';
  private readonly sourceProjectAmplifyDirPath: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url
  );
  private readonly sourceProjectConstantFilePath: string = new URL(
    `${this.sourceProjectAmplifyDirSuffix}/constants.ts`,
    import.meta.url
  ).toString();

  /**
   * Create a test project instance.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    private readonly secretClient: SecretClient
  ) {
    super(name, projectDirPath, projectAmplifyDirPath, cfnClient);
  }

  /**
   * Creates a test project directory and instance.
   */
  static createProject = async (
    e2eProjectDir: string,
    cfnClient: CloudFormationClient,
    secretClient: SecretClient
  ): Promise<TestProject> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject('data-storage-auth', e2eProjectDir);

    const project = new DataStorageAuthWithTriggerTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      cfnClient,
      secretClient
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

  setUpDeployEnvironment = async (
    backendId: UniqueBackendIdentifier
  ): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const { secretNames } = await import(this.sourceProjectConstantFilePath);
    for (const secretField in secretNames) {
      const secretName = secretNames[secretField];
      const secretValue = `${secretName as string}-e2eTestValue`;
      await this.secretClient.setSecret(backendId, secretName, secretValue);
    }
  };

  clearDeployEnvironment = async (
    backendId: UniqueBackendIdentifier
  ): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const { secretNames } = await import(this.sourceProjectConstantFilePath);
    // clear secrets
    for (const secretField in secretNames) {
      const secretName = secretNames[secretField];
      await this.secretClient.removeSecret(backendId, secretName);
    }
  };

  assertDeployment = async (): Promise<void> => {
    const { default: clientConfig } = await import(
      pathToFileURL(
        path.join(this.projectDirPath, 'amplifyconfiguration.js')
      ).toString()
    );
    assert.deepStrictEqual(Object.keys(clientConfig).sort(), [
      'aws_appsync_authenticationType',
      'aws_appsync_graphqlEndpoint',
      'aws_appsync_region',
      'aws_cognito_region',
      'aws_user_files_s3_bucket',
      'aws_user_files_s3_bucket_region',
      'aws_user_pools_id',
      'aws_user_pools_web_client_id',
    ]);
  };
}

import fs from 'fs/promises';
import { SecretClient } from '@aws-amplify/backend-secret';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectBase, TestProjectUpdate } from './test_project_base.js';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import { TestProjectCreator } from './test_project_creator.js';
import {
  amplifySharedSecretNameKey,
  createAmplifySharedSecretName,
} from '../shared_secret.js';

/**
 * Creates test projects with data category.
 */
export class DataComplexSchemaTestProjectCreator implements TestProjectCreator {
  readonly name = 'data-complex-schema';

  /**
   * Creates project creator.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient,
    private readonly secretClient: SecretClient
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const {
      projectName,
      projectRoot,
      projectAmplifyDir,
      projectDotAmplifyDir,
    } = await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new DataComplexSchemaTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.secretClient
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
 * Test project with data category.
 */
class DataComplexSchemaTestProject extends TestProjectBase {
  // Note that this is pointing to the non-compiled project directory
  // This allows us to test that we are able to deploy js, cjs, ts, etc without compiling with tsc first
  readonly sourceProjectDirPath =
    '../../src/test-projects/data-complex-schema-ts';

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
    await super.deploy(backendIdentifier, sharedSecretEnvObject);
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
  }

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
}

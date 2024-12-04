import fs from 'fs/promises';
import { createEmptyAmplifyProject } from '../create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectBase, TestProjectUpdate } from '../test_project_base.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'path';
import { TestProjectCreator } from '../test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import { execa } from 'execa';

/**
 * Creates test projects with function hotswap.
 */
export class FunctionCodeHotswapTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'function-code-hotswap';

  /**
   * Creates project creator.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig
    )
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new FunctionCodeHotswapTestTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient
    );
    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      }
    );

    // we're not starting from create flow. install latest versions of dependencies.
    await execa(
      'npm',
      [
        'install',
        '@aws-amplify/backend',
        '@aws-amplify/backend-cli',
        'aws-cdk@^2',
        'aws-cdk-lib@^2',
        'constructs@^10.0.0',
        'typescript@^5.0.0',
        'tsx',
        'esbuild',
      ],
      {
        cwd: projectRoot,
        stdio: 'inherit',
      }
    );

    return project;
  };
}

/**
 * Test project with function hotswap.
 */
class FunctionCodeHotswapTestTestProject extends TestProjectBase {
  // Note that this is pointing to the non-compiled project directory
  // This allows us to test that we are able to deploy js, cjs, ts, etc. without compiling with tsc first
  readonly sourceProjectRootPath =
    '../../../src/test-projects/live-dependency-health-checks-projects/function-code-hotswap';

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

  /**
   * Create a test project instance.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient
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
  override async getUpdates(): Promise<TestProjectUpdate[]> {
    return [
      {
        replacements: [
          this.getUpdateReplacementDefinition('func-src/handler.ts'),
        ],
      },
    ];
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
}

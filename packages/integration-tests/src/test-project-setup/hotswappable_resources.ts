import fs from 'fs/promises';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectBase, TestProjectUpdate } from './test_project_base.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'path';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

/**
 * Creates test projects with hotswappable resources.
 *
 * This project is used by canary tests. Its goal is to ensure that resources
 * are hotswapped successfully. The priority of this test project is fast runtime.
 * Therefore, assertions and resource mix is kept minimal and complex expansions
 * to provide functional coverage should be avoided.
 */
export class HotswappableResourcesTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'hotswappable-resources';

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

    const project = new HotswappableResourcesTestProject(
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

    return project;
  };
}

/**
 * Test project with hotswappable resources.
 */
class HotswappableResourcesTestProject extends TestProjectBase {
  // Note that this is pointing to the non-compiled project directory
  // This allows us to test that we are able to deploy js, cjs, ts, etc. without compiling with tsc first
  readonly sourceProjectRootPath =
    '../../src/test-projects/hotswappable-resources';

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
          this.getUpdateReplacementDefinition('data/resource.ts'),
          this.getUpdateReplacementDefinition('func-src/handler.ts'),
        ],
        deployThresholdSec: {
          onWindows: 50,
          onOther: 40,
        },
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

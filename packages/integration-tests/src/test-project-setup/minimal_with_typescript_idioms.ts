import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

/**
 * Creates minimal test projects with typescript idioms.
 */
export class MinimalWithTypescriptIdiomTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'typescript-idiom';

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

    const project = new MinimalWithTypescriptIdiomTestProject(
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
 * The minimal test with typescript idioms.
 */
class MinimalWithTypescriptIdiomTestProject extends TestProjectBase {
  // Note that this is pointing to the non-compiled project directory
  // This allows us to test that we are able to deploy js, cjs, ts, etc without compiling with tsc first
  readonly sourceProjectDirPath =
    '../../src/test-projects/minimalist-project-with-typescript-idioms';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
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
}

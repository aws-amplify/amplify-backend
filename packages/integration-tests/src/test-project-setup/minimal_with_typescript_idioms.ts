import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import assert from 'node:assert';
import path from 'path';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';

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
  constructor(private readonly cfnClient: CloudFormationClient) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new MinimalWithTypescriptIdiomTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient
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
 * The minimal test with typescript idioms.
 */
class MinimalWithTypescriptIdiomTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../test-projects/minimalist-project-with-typescript-idioms';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirPath: URL = new URL(
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
    cfnClient: CloudFormationClient
  ) {
    super(name, projectDirPath, projectAmplifyDirPath, cfnClient);
  }

  assertPostDeployment = async (): Promise<void> => {
    const clientConfigStats = await fs.stat(
      path.join(this.projectDirPath, 'amplifyconfiguration.json')
    );
    assert.ok(clientConfigStats.isFile());
  };
}

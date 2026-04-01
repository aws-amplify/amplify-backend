import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import path from 'path';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

/**
 * Creates a full-stack hosting project (auth + data + storage + hosting SPA)
 * for testing the two-phase deploy model where backend and frontend are
 * deployed to separate CloudFormation stacks.
 */
export class StandaloneHostingTwoPhaseTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'standalone-hosting-two-phase';

  /**
   * Create test project creator with optional AWS client overrides.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig,
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig,
    ),
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new StandaloneHostingTwoPhaseTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
    );

    // Copy the amplify/ directory (backend.ts + hosting.ts + auth/ + data/ + storage/)
    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      { recursive: true },
    );

    // Copy the static-site/ directory alongside the amplify/ directory
    const sourceStaticSiteDir = new URL(
      `${project.sourceProjectDirPath}/static-site`,
      import.meta.url,
    );
    const destStaticSiteDir = path.join(projectRoot, 'static-site');
    await fs.cp(sourceStaticSiteDir, destStaticSiteDir, { recursive: true });

    return project;
  };
}

class StandaloneHostingTwoPhaseTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../src/test-projects/standalone-hosting-two-phase';

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    `${this.sourceProjectDirPath}/amplify`,
    import.meta.url,
  );
}

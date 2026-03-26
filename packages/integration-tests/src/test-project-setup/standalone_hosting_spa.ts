import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import path from 'path';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

/**
 * Creates a minimal hosting SPA project for standalone deployment E2E testing.
 */
export class StandaloneHostingSpaTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'standalone-hosting-spa';

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

    const project = new StandaloneHostingSpaTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
    );

    // Copy the amplify/ directory (backend.ts + hosting/resource.ts)
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

class StandaloneHostingSpaTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../src/test-projects/standalone-hosting-spa';

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    `${this.sourceProjectDirPath}/amplify`,
    import.meta.url,
  );
}

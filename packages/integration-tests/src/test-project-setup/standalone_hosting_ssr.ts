import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import path from 'path';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

/**
 * Creates a minimal hosting SSR (Next.js) project for standalone deployment E2E testing.
 */
export class StandaloneHostingSsrTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'standalone-hosting-ssr';

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

    const project = new StandaloneHostingSsrTestProject(
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

    // Copy the .next/ build output directory alongside the amplify/ directory
    const sourceNextDir = new URL(
      `${project.sourceProjectDirPath}/.next`,
      import.meta.url,
    );
    const destNextDir = path.join(projectRoot, '.next');
    await fs.cp(sourceNextDir, destNextDir, { recursive: true });

    // Copy the public/ directory alongside the amplify/ directory
    const sourcePublicDir = new URL(
      `${project.sourceProjectDirPath}/public`,
      import.meta.url,
    );
    const destPublicDir = path.join(projectRoot, 'public');
    await fs.cp(sourcePublicDir, destPublicDir, { recursive: true });

    // Copy next.config.js (required by the nextjs adapter pre-flight check)
    const sourceNextConfig = new URL(
      `${project.sourceProjectDirPath}/next.config.js`,
      import.meta.url,
    );
    await fs.cp(sourceNextConfig, path.join(projectRoot, 'next.config.js'));

    return project;
  };
}

class StandaloneHostingSsrTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../src/test-projects/standalone-hosting-ssr';

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    `${this.sourceProjectDirPath}/amplify`,
    import.meta.url,
  );
}

import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

/**
 * Creates a minimal auth project for standalone deployment E2E testing.
 *
 * This is intentionally lightweight — the standalone deployment template
 * verifies no Amplify Hosting resources are present, and the base
 * class checks client config. Comprehensive resource verification is
 * covered by the data-storage-auth standalone test which reuses the
 * existing DataStorageAuthWithTriggerTestProjectCreator.
 */
export class StandaloneAuthTestProjectCreator implements TestProjectCreator {
  readonly name = 'standalone-auth';

  /**
   * Creates project creator.
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

    const project = new StandaloneAuthTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
    );
    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      { recursive: true },
    );
    return project;
  };
}

class StandaloneAuthTestProject extends TestProjectBase {
  readonly sourceProjectDirPath = '../../src/test-projects/standalone-auth-e2e';

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    `${this.sourceProjectDirPath}/amplify`,
    import.meta.url,
  );

  // No custom assertPostDeployment — base class checks client config,
  // and the standalone template checks for no Amplify Hosting resources.
}

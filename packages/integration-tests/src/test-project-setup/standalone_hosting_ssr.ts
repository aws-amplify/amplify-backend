import { TestProjectBase, TestProjectUpdate } from './test_project_base.js';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { ampxCli } from '../process-controller/process_controller.js';

/**
 * Creates a real Next.js SSR hosting project with auth, data, and storage
 * for standalone deployment E2E testing.
 *
 * Unlike mock-based fixtures, this copies real Next.js source code and runs
 * `npm install` so that `npx @opennextjs/aws build` can execute during deployment.
 */
export class StandaloneHostingSsrTestProjectCreator implements TestProjectCreator {
  readonly name = 'standalone-hosting-ssr';

  /**
   * Creates a new StandaloneHostingSsrTestProjectCreator instance.
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

    const sourceDir = fileURLToPath(
      new URL(project.sourceProjectDirPath, import.meta.url),
    );

    // Copy amplify/ directory (backend.ts + hosting.ts + auth/ + data/ + storage/)
    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      { recursive: true },
    );

    // Copy Next.js source files
    await fs.cp(path.join(sourceDir, 'app'), path.join(projectRoot, 'app'), {
      recursive: true,
    });
    await fs.cp(path.join(sourceDir, 'lib'), path.join(projectRoot, 'lib'), {
      recursive: true,
    });
    await fs.cp(
      path.join(sourceDir, 'public'),
      path.join(projectRoot, 'public'),
      { recursive: true },
    );
    await fs.cp(
      path.join(sourceDir, 'next.config.js'),
      path.join(projectRoot, 'next.config.js'),
    );
    await fs.cp(
      path.join(sourceDir, 'tsconfig.json'),
      path.join(projectRoot, 'tsconfig.json'),
    );
    await fs.cp(
      path.join(sourceDir, 'middleware.ts'),
      path.join(projectRoot, 'middleware.ts'),
    );

    // Write the project package.json with Next.js dependencies
    // (overwrite the one created by createEmptyAmplifyProject)
    await fs.cp(
      path.join(sourceDir, 'package.json'),
      path.join(projectRoot, 'package.json'),
    );

    // Install dependencies — required for OpenNext build during deployment
    process.stderr.write(
      `Installing Next.js dependencies in ${projectRoot}...\n`,
    );
    execSync('npm install --prefer-offline', {
      cwd: projectRoot,
      stdio: 'pipe',
      env: { ...process.env, NODE_OPTIONS: '' },
      timeout: 120000,
    });
    process.stderr.write(`Dependencies installed successfully.\n`);

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

  private readonly sourceProjectUpdateV2DirURL: URL = new URL(
    `${this.sourceProjectDirPath}/update-v2`,
    import.meta.url,
  );

  /**
   * Override deploy to pass --backend / --frontend / --yes flags based on
   * the BackendIdentifier name. This matches the deploy command on
   * snapshot/iac-hosting which supports selective deployment.
   */
  override async deploy(
    backendIdentifier: BackendIdentifier,
    environment?: Record<string, string>,
  ) {
    const args = [
      'deploy',
      '--identifier',
      backendIdentifier.namespace,
      '--yes',
    ];
    if (backendIdentifier.name === 'backend') {
      args.push('--backend');
    } else if (backendIdentifier.name === 'hosting') {
      args.push('--frontend');
    }
    // No flag = deploy both (for 'full' identifier)
    await ampxCli(args, this.projectDirPath, {
      env: { CI: 'true', ...environment },
    }).run();
  }

  /**
   * Returns an update that replaces the home page with v2 content and changes
   * Lambda memory to 512 MB. After applying this update, redeploying the hosting
   * stack triggers a fresh OpenNext build with the new source.
   */
  override async getUpdates(): Promise<TestProjectUpdate[]> {
    return [
      {
        replacements: [
          {
            source: pathToFileURL(
              path.join(
                fileURLToPath(this.sourceProjectUpdateV2DirURL),
                'app',
                'page.tsx',
              ),
            ),
            destination: pathToFileURL(
              path.join(this.projectDirPath, 'app', 'page.tsx'),
            ),
          },
          {
            source: pathToFileURL(
              path.join(
                fileURLToPath(this.sourceProjectUpdateV2DirURL),
                'amplify',
                'hosting.ts',
              ),
            ),
            destination: pathToFileURL(
              path.join(this.projectAmplifyDirPath, 'hosting.ts'),
            ),
          },
        ],
      },
    ];
  }
}

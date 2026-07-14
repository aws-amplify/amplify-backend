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
 * Creates a real Nuxt 4 SSR hosting project with auth, data, and storage
 * for standalone deployment E2E testing.
 *
 * Mirrors StandaloneHostingSsrTestProjectCreator (the Next.js variant):
 * copies real Nuxt source code into a fresh tmpdir and runs `npm install`
 * so that `nuxt build` can execute during deployment.
 */
export class StandaloneHostingNuxtTestProjectCreator implements TestProjectCreator {
  readonly name = 'standalone-hosting-nuxt';

  /**
   * Creates a new StandaloneHostingNuxtTestProjectCreator instance.
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

    const project = new StandaloneHostingNuxtTestProject(
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

    // Copy Nuxt source files
    await fs.cp(path.join(sourceDir, 'app'), path.join(projectRoot, 'app'), {
      recursive: true,
    });
    await fs.cp(
      path.join(sourceDir, 'server'),
      path.join(projectRoot, 'server'),
      { recursive: true },
    );
    await fs.cp(
      path.join(sourceDir, 'public'),
      path.join(projectRoot, 'public'),
      { recursive: true },
    );
    await fs.cp(
      path.join(sourceDir, 'nuxt.config.ts'),
      path.join(projectRoot, 'nuxt.config.ts'),
    );
    await fs.cp(
      path.join(sourceDir, 'tsconfig.json'),
      path.join(projectRoot, 'tsconfig.json'),
    );

    // Overwrite the package.json created by createEmptyAmplifyProject
    // with one that has Nuxt + @nuxt/image + sharp.
    await fs.cp(
      path.join(sourceDir, 'package.json'),
      path.join(projectRoot, 'package.json'),
    );

    // Install dependencies — required for `nuxt build` to run during
    // deployment. sharp is NOT a fixture dep: it's an IPX-only concern,
    // and the adapter installs the linux-x64 sharp binary into its own
    // `.amplify-hosting/image-optimization/` bundle.
    process.stderr.write(`Installing Nuxt dependencies in ${projectRoot}...\n`);
    execSync(
      'npm install --prefer-offline --no-audit --no-fund --prefer-dedupe',
      {
        cwd: projectRoot,
        stdio: 'pipe',
        env: { ...process.env, NODE_OPTIONS: '' },
        timeout: 180000,
      },
    );
    process.stderr.write(`Dependencies installed successfully.\n`);

    return project;
  };
}

class StandaloneHostingNuxtTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../src/test-projects/standalone-hosting-nuxt';

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
   * the BackendIdentifier name. Matches the deploy command on
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
   * Lambda memory to 512 MB. After applying this update, redeploying the
   * hosting stack triggers a fresh Nuxt build with the new source.
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
                'pages',
                'index.vue',
              ),
            ),
            destination: pathToFileURL(
              path.join(this.projectDirPath, 'app', 'pages', 'index.vue'),
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

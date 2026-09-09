import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { ampxCli } from '../process-controller/process_controller.js';

/**
 * Creates a real Astro 5 server-output hosting project with auth, data, and
 * storage for standalone deployment E2E testing.
 *
 * Mirrors StandaloneHostingNuxtTestProjectCreator: copies real Astro source
 * code into a fresh tmpdir, then runs `npm install` so `astro build` can
 * execute during deployment.
 */
export class StandaloneHostingAstroTestProjectCreator implements TestProjectCreator {
  readonly name = 'standalone-hosting-astro';

  /**
   * Creates a new StandaloneHostingAstroTestProjectCreator instance.
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

    const project = new StandaloneHostingAstroTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
    );

    const sourceDir = fileURLToPath(
      new URL(project.sourceProjectDirPath, import.meta.url),
    );

    // amplify/ directory (backend.ts + hosting.ts + auth/ + data/ + storage/)
    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      { recursive: true },
    );

    await fs.cp(path.join(sourceDir, 'src'), path.join(projectRoot, 'src'), {
      recursive: true,
    });
    await fs.cp(
      path.join(sourceDir, 'astro.config.mjs'),
      path.join(projectRoot, 'astro.config.mjs'),
    );
    await fs.cp(
      path.join(sourceDir, 'tsconfig.json'),
      path.join(projectRoot, 'tsconfig.json'),
    );

    // Overwrite the generated package.json with one that has astro deps.
    await fs.cp(
      path.join(sourceDir, 'package.json'),
      path.join(projectRoot, 'package.json'),
    );

    process.stderr.write(
      `Installing Astro dependencies in ${projectRoot}...\n`,
    );
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

class StandaloneHostingAstroTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../src/test-projects/standalone-hosting-astro';

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    `${this.sourceProjectDirPath}/amplify`,
    import.meta.url,
  );

  /**
   * Override deploy to pass --backend / --frontend / --yes flags by
   * BackendIdentifier name. Matches the snapshot/iac-hosting deploy
   * command's selective deployment shape.
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
    await ampxCli(args, this.projectDirPath, {
      env: { CI: 'true', ...environment },
    }).run();
  }
}

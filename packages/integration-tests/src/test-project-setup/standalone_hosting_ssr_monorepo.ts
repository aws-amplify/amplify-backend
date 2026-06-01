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
import { setupDirAsEsmModule } from './setup_dir_as_esm_module.js';

/**
 * Creates a real Next.js SSR hosting project laid out as an npm-workspaces
 * monorepo (`apps/web/`) so that deployment tests exercise the standalone
 * monorepo path: `output: 'standalone'` + `outputFileTracingRoot` pointing
 * a level above the app dir. The deployment success itself is the
 * load-bearing assertion — if the hosting adapter's
 * `resolveStandaloneServerPath` regresses, the deploy fails before the
 * test can fetch.
 */
export class StandaloneHostingSsrMonorepoTestProjectCreator implements TestProjectCreator {
  readonly name = 'standalone-hosting-ssr-monorepo';

  /**
   * Creates a new StandaloneHostingSsrMonorepoTestProjectCreator instance.
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
    // Workspace root: bare amplify dir/.amplify dir get created here by
    // createEmptyAmplifyProject but they're not used — the real amplify
    // backend lives at apps/web/amplify. We move it into place below.
    const { projectName, projectRoot } = await createEmptyAmplifyProject(
      this.name,
      e2eProjectDir,
    );

    // Wipe the auto-created amplify/ + .amplify/ at the workspace root —
    // amplify lives inside the app dir for monorepo standalone builds.
    await fs.rm(path.join(projectRoot, 'amplify'), {
      recursive: true,
      force: true,
    });
    await fs.rm(path.join(projectRoot, '.amplify'), {
      recursive: true,
      force: true,
    });
    // Replace the workspace root package.json with one that declares
    // workspaces so npm install hoists correctly.
    const sourceDir = fileURLToPath(
      new URL(
        '../../src/test-projects/standalone-hosting-ssr-monorepo',
        import.meta.url,
      ),
    );
    await fs.cp(
      path.join(sourceDir, 'package.json'),
      path.join(projectRoot, 'package.json'),
      { force: true },
    );

    // Copy the apps/web tree (next.js source + amplify dir) into place.
    const appWebDir = path.join(projectRoot, 'apps', 'web');
    await fs.mkdir(appWebDir, { recursive: true });
    await fs.cp(path.join(sourceDir, 'apps', 'web'), appWebDir, {
      recursive: true,
    });
    await fs.mkdir(path.join(appWebDir, '.amplify'), { recursive: true });
    await setupDirAsEsmModule(path.join(appWebDir, 'amplify'));

    const project = new StandaloneHostingSsrMonorepoTestProject(
      projectName,
      appWebDir,
      path.join(appWebDir, 'amplify'),
      this.cfnClient,
      this.amplifyClient,
    );

    // Install dependencies at the workspace root so the standalone build
    // can trace deps up to the monorepo root.
    process.stderr.write(
      `Installing Next.js monorepo dependencies in ${projectRoot}...\n`,
    );
    execSync('npm install --prefer-offline', {
      cwd: projectRoot,
      stdio: 'pipe',
      env: { ...process.env, NODE_OPTIONS: '' },
      timeout: 180000,
    });
    process.stderr.write(`Dependencies installed successfully.\n`);

    return project;
  };
}

class StandaloneHostingSsrMonorepoTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../src/test-projects/standalone-hosting-ssr-monorepo';

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    `${this.sourceProjectDirPath}/apps/web/amplify`,
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

import * as fs from 'fs';
import * as path from 'path';
import {
  AmplifyResourceGroupName,
  ConstructContainerEntryGenerator,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Tags } from 'aws-cdk-lib';
import { AmplifyUserError, TagName } from '@aws-amplify/platform-core';
import { HostingProps, HostingResources } from './types.js';
import {
  AmplifyHostingConstruct,
  AmplifyHostingConstructProps,
} from './constructs/hosting_construct.js';
import { detectFramework, getAdapter } from './adapters/index.js';
import { checkNextConfig } from './adapters/nextjs.js';
import { getHostingOutputDir } from './manifest/parser.js';
import { runBuild } from './build/runner.js';

// Lock file in project directory — avoids insecure temp dir (CodeQL js/file-system-race, js/insecure-temporary-file)
const getLockFilePath = (projectDir: string): string =>
  path.join(projectDir, '.amplify-hosting-deploy.lock');

const LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour stale lock timeout

/**
 * Acquire a file-based deploy lock to prevent concurrent deployments.
 * Uses exclusive-create (wx) flag for atomic lock acquisition — no TOCTOU race.
 */
const acquireLock = (projectDir: string): void => {
  const lockFile = getLockFilePath(projectDir);
  try {
    fs.writeFileSync(
      lockFile,
      JSON.stringify({ pid: process.pid, timestamp: Date.now() }),
      { flag: 'wx', mode: 0o600 },
    );
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      // Lock file exists — check if stale
      try {
        const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
        if (Date.now() - lockData.timestamp < LOCK_TIMEOUT_MS) {
          throw new AmplifyUserError('DeploymentInProgressError', {
            message: `Another deployment appears to be in progress (started ${Math.round((Date.now() - lockData.timestamp) / 1000)}s ago).`,
            resolution: `Wait for the other deployment to complete. If no deployment is running, delete ${lockFile}`,
          });
        }
      } catch (e) {
        if ((e as Error).name === 'DeploymentInProgressError') throw e;
        // Corrupted lock file — fall through to replace it
      }
      // Stale or corrupted lock — remove and retry atomically
      fs.unlinkSync(lockFile);
      fs.writeFileSync(
        lockFile,
        JSON.stringify({ pid: process.pid, timestamp: Date.now() }),
        { flag: 'wx', mode: 0o600 },
      );
      return;
    }
    throw err;
  }
};

/**
 * Release the deploy lock.
 */
const releaseLock = (projectDir: string): void => {
  try {
    fs.unlinkSync(getLockFilePath(projectDir));
    // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
  } catch {
    // Lock file may already be deleted by another process; safe to ignore
  }
};

/**
 * Generates hosting construct entries for the construct container.
 */
export class AmplifyHostingGenerator
  implements ConstructContainerEntryGenerator
{
  readonly resourceGroupName: AmplifyResourceGroupName = 'hosting';
  private readonly name: string;

  /**
   * Create a new hosting generator with the given props.
   */
  constructor(
    private readonly props: HostingProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
  ) {
    this.name = props.name ?? 'amplifyHosting';
  }

  generateContainerEntry = ({
    scope,
  }: GenerateContainerEntryProps): ResourceProvider<HostingResources> => {
    const projectDir = process.cwd();
    acquireLock(projectDir);
    try {
      return this.doGenerateContainerEntry(scope, projectDir);
    } finally {
      releaseLock(projectDir);
    }
  };

  private doGenerateContainerEntry = (
    scope: import('constructs').Construct,
    projectDir: string,
  ): ResourceProvider<HostingResources> => {
    // Auto-detect or use explicit framework
    const framework = this.props.framework ?? detectFramework(projectDir);

    if (!this.props.framework) {
      process.stdout.write(
        `Detected framework: ${framework} (from package.json)\n`,
      );
    }

    // Next.js pre-flight validation
    if (framework === 'nextjs') {
      checkNextConfig(projectDir);
    }

    // Run the build command if provided
    if (this.props.buildCommand) {
      runBuild({
        command: this.props.buildCommand,
        cwd: projectDir,
      });
    }

    // Default build output dirs per framework
    const buildOutputDir =
      this.props.buildOutputDir ?? getDefaultBuildOutputDir(framework);

    const absoluteBuildOutputDir = path.isAbsolute(buildOutputDir)
      ? buildOutputDir
      : path.join(projectDir, buildOutputDir);

    // Get the adapter (custom or registry) and run it to produce .amplify-hosting/
    const adapter = this.props.customAdapter ?? getAdapter(framework);
    const manifest = adapter(absoluteBuildOutputDir, projectDir);

    // Resolve paths
    const hostingOutputDir = getHostingOutputDir(projectDir);
    const staticAssetPath = path.join(hostingOutputDir, 'static');
    const computeBasePath = path.join(hostingOutputDir, 'compute');

    const constructProps: AmplifyHostingConstructProps = {
      manifest,
      staticAssetPath,
      computeBasePath,
      domain: this.props.domain,
      waf: this.props.waf,
      compute: this.props.compute,
      retainOnDelete: this.props.retainOnDelete,
      accessLogging: this.props.accessLogging,
      contentSecurityPolicy: this.props.contentSecurityPolicy,
      name: this.name,
    };

    const hostingConstruct = new AmplifyHostingConstruct(
      scope,
      this.name,
      constructProps,
    );

    Tags.of(hostingConstruct).add(TagName.FRIENDLY_NAME, this.name);

    // Store outputs for client config generation
    this.getInstanceProps.outputStorageStrategy.addBackendOutputEntry(
      'AWS::Amplify::Hosting',
      {
        version: '1',
        payload: {
          distributionUrl: hostingConstruct.distributionUrl,
        },
      },
    );

    return {
      resources: hostingConstruct.getResources(),
    };
  };
}

/**
 * Get the default build output directory for a given framework.
 */
const getDefaultBuildOutputDir = (framework: string): string => {
  switch (framework) {
    case 'nextjs':
      return '.next';
    case 'spa':
      return 'dist';
    case 'static':
      return 'public';
    default:
      return 'dist';
  }
};

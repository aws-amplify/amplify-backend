import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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
} from './constructs/hosting-construct.js';
import { detectFramework, getAdapter } from './adapters/index.js';
import { checkNextConfig } from './adapters/nextjs.js';
import { getHostingOutputDir, parseManifest } from './manifest/parser.js';
import { runBuild } from './build/runner.js';

const LOCK_FILE = path.join(os.tmpdir(), 'amplify-hosting-deploy.lock');
const LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour stale lock timeout

/**
 * Acquire a file-based deploy lock to prevent concurrent deployments.
 */
const acquireLock = (): void => {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
      if (Date.now() - lockData.timestamp < LOCK_TIMEOUT_MS) {
        throw new AmplifyUserError('DeploymentInProgressError', {
          message: `Another deployment appears to be in progress (started ${Math.round((Date.now() - lockData.timestamp) / 1000)}s ago).`,
          resolution: `Wait for the other deployment to complete. If no deployment is running, delete ${LOCK_FILE}`,
        });
      }
    } catch (e) {
      if ((e as Error).name === 'DeploymentInProgressError') throw e;
      // Corrupted lock file, remove it
    }
    fs.unlinkSync(LOCK_FILE);
  }
  fs.writeFileSync(
    LOCK_FILE,
    JSON.stringify({ pid: process.pid, timestamp: Date.now() }),
  );
};

/**
 * Release the deploy lock.
 */
const releaseLock = (): void => {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch {
    /* ignore — may already be deleted */
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

  constructor(
    private readonly props: HostingProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
  ) {
    this.name = props.name ?? 'amplifyHosting';
  }

  generateContainerEntry = ({
    scope,
  }: GenerateContainerEntryProps): ResourceProvider<HostingResources> => {
    acquireLock();
    try {
      return this.doGenerateContainerEntry(scope);
    } finally {
      releaseLock();
    }
  };

  private doGenerateContainerEntry = (
    scope: import('constructs').Construct,
  ): ResourceProvider<HostingResources> => {
    // Determine the project directory (one level above amplify/)
    const projectDir = process.cwd();

    // Auto-detect or use explicit framework
    const framework =
      this.props.framework ?? detectFramework(projectDir);

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
    const buildOutputDir = this.props.buildOutputDir ??
      getDefaultBuildOutputDir(framework);

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

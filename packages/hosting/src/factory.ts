import { App, NestedStack, Stack, Tags } from 'aws-cdk-lib';
import {
  AmplifyUserError,
  BackendIdentifierConversions,
  CDKContextKey,
  TagName,
} from '@aws-amplify/platform-core';
import {
  AttributionMetadataStorage,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-output-storage';
import {
  BackendIdentifier,
  DeploymentType,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { HostingProps, HostingResources } from './types.js';
import {
  AmplifyHostingConstruct,
  AmplifyHostingConstructProps,
} from './constructs/hosting_construct.js';
import { detectFramework, getAdapter } from './adapters/index.js';
import { checkNextConfig } from './adapters/nextjs.js';
import { getHostingOutputDir } from './manifest/parser.js';
import { runBuild } from './build/runner.js';
import { getDefaultBuildOutputDir } from './defaults.js';
import * as path from 'path';
import * as fs from 'fs';
import { platformOutputKey } from '@aws-amplify/backend-output-schemas';

export type BackendHosting = ResourceProvider<HostingResources>;

// Lock file in project directory — avoids insecure temp dir
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
      // Stale or corrupted lock — take over atomically via rename
      const tempLockFile = `${lockFile}.${process.pid}.tmp`;
      fs.writeFileSync(
        tempLockFile,
        JSON.stringify({ pid: process.pid, timestamp: Date.now() }),
        { mode: 0o600 },
      );
      try {
        fs.renameSync(tempLockFile, lockFile); // Atomic on POSIX
      } catch (renameErr) {
        // Another process won the race — clean up our temp file
        try {
          fs.unlinkSync(tempLockFile);
          // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
        } catch {
          /* ignore */
        }
        throw new AmplifyUserError(
          'DeploymentInProgressError',
          {
            message:
              'Another deployment acquired the lock while cleaning stale lock.',
            resolution: `Wait for the other deployment to complete, or delete ${lockFile}`,
          },
          renameErr as Error,
        );
      }
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

const rootStackTypeIdentifier = 'hosting';

/**
 * Read backend identifier from CDK context.
 */
const getBackendIdentifier = (scope: App): BackendIdentifier => {
  const backendNamespace = scope.node.getContext(
    CDKContextKey.BACKEND_NAMESPACE,
  );
  if (typeof backendNamespace !== 'string') {
    throw new Error(
      `${CDKContextKey.BACKEND_NAMESPACE} CDK context value is not a string`,
    );
  }
  const backendName = scope.node.getContext(CDKContextKey.BACKEND_NAME);
  if (typeof backendName !== 'string') {
    throw new Error(
      `${CDKContextKey.BACKEND_NAME} CDK context value is not a string`,
    );
  }
  const deploymentType: DeploymentType = scope.node.getContext(
    CDKContextKey.DEPLOYMENT_TYPE,
  );
  const expectedDeploymentTypeValues = ['sandbox', 'branch', 'standalone'];
  if (!expectedDeploymentTypeValues.includes(deploymentType)) {
    throw new Error(
      `${CDKContextKey.DEPLOYMENT_TYPE} CDK context value is not in (${expectedDeploymentTypeValues.join(', ')})`,
    );
  }
  return {
    type: deploymentType,
    namespace: backendNamespace,
    name: backendName,
  };
};

/**
 * The return type of `defineHosting()`.
 */
export type HostingResult = {
  /**
   * The CDK resources created by hosting.
   */
  resources: HostingResources;
  /**
   * The root hosting stack.
   */
  stack: Stack;
  /**
   * Create an additional CDK stack for custom resources.
   */
  createStack: (name: string) => Stack;
};

/**
 * Create the hosting infrastructure as a standalone CDK entry point.
 *
 * **⚠️ Important:** This must be called in a SEPARATE file (`amplify/hosting.ts`),
 * NOT inside `amplify/backend.ts`. Hosting deploys as an independent CloudFormation
 * stack so it can be deployed separately from the backend (e.g., frontend-only deploys).
 *
 * The CLI calls this file as a separate CDK app via `ampx deploy`.
 * @example SPA (React, Vue, etc.)
 * ```ts
 * // amplify/hosting.ts
 * import { defineHosting } from '@aws-amplify/hosting';
 *
 * defineHosting({
 *   framework: 'spa',
 *   buildCommand: 'npm run build',
 * });
 * ```
 * @example Next.js SSR
 * ```ts
 * // amplify/hosting.ts
 * import { defineHosting } from '@aws-amplify/hosting';
 *
 * const hosting = defineHosting({
 *   framework: 'nextjs',
 *   buildCommand: 'npm run build',
 * });
 *
 * // Optional: add custom resources
 * const monitoring = hosting.createStack('monitoring');
 * ```
 * @param props - Hosting configuration (framework, build command, domain, etc.). All optional.
 * @returns Hosting result containing CDK resources, root stack, and a `createStack` helper.
 * @see https://docs.amplify.aws/hosting/
 */
export const defineHosting = (props: HostingProps = {}): HostingResult => {
  const app = new App();
  const backendId = getBackendIdentifier(app);

  // HostedZone.fromLookup() (used for custom domains) requires the stack to
  // have an explicit env so CDK can make Route 53 API calls at synth time.
  const stackEnv = props.domain
    ? {
        account:
          process.env.CDK_DEFAULT_ACCOUNT ??
          process.env.AWS_ACCOUNT_ID ??
          undefined,
        region:
          process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? undefined,
      }
    : undefined;

  const rootStack = new Stack(
    app,
    BackendIdentifierConversions.toStackName(backendId),
    { env: stackEnv },
  );

  new AttributionMetadataStorage().storeAttributionMetadata(
    rootStack,
    rootStackTypeIdentifier,
    path.resolve(__dirname, '..', 'package.json'),
  );

  const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
    rootStack,
  );

  outputStorageStrategy.addBackendOutputEntry(platformOutputKey, {
    version: '1',
    payload: {
      deploymentType: backendId.type,
      region: rootStack.region,
    },
  });

  Tags.of(rootStack).add('created-by', 'amplify');
  if (backendId.type === 'standalone') {
    Tags.of(rootStack).add('amplify:branch-name', backendId.name);
    Tags.of(rootStack).add('amplify:deployment-type', 'standalone');
  }

  // Listen for synth signal from CDK Toolkit
  process.once('message', (message) => {
    if (message === 'amplifySynth') {
      app.synth({ errorOnDuplicateSynth: false });
    }
  });

  // Build the hosting construct inside a nested stack
  const hostingNestedStack = new NestedStack(rootStack, 'hosting');
  const resources = buildHostingConstruct(props, hostingNestedStack);

  // Track custom stacks to prevent duplicates
  const customStacks: Record<string, Stack> = {};

  const createStack = (name: string): Stack => {
    if (customStacks[name]) {
      throw new Error(`Custom stack named ${name} has already been created`);
    }
    const stack = new NestedStack(rootStack, name);
    new AttributionMetadataStorage().storeAttributionMetadata(
      stack,
      'custom',
      path.resolve(__dirname, '..', 'package.json'),
    );
    customStacks[name] = stack;
    return stack;
  };

  return {
    resources,
    stack: rootStack,
    createStack,
  };
};

/**
 * Build the hosting construct from props.
 * Handles framework detection, build execution, adapter invocation,
 * and CDK construct creation.
 */
const buildHostingConstruct = (
  props: HostingProps,
  scope: Stack,
): HostingResources => {
  const projectDir = process.cwd();
  acquireLock(projectDir);
  try {
    return doBuildHostingConstruct(props, scope, projectDir);
  } finally {
    releaseLock(projectDir);
  }
};

const doBuildHostingConstruct = (
  props: HostingProps,
  scope: Stack,
  projectDir: string,
): HostingResources => {
  const name = props.name ?? 'amplifyHosting';

  // Auto-detect or use explicit framework
  const framework = props.framework ?? detectFramework(projectDir);

  if (!props.framework) {
    process.stderr.write(
      `Detected framework: ${framework} (from package.json)\n`,
    );
  }

  // Next.js pre-flight validation
  if (framework === 'nextjs') {
    checkNextConfig(projectDir);
  }

  // Run the build command if provided
  if (props.buildCommand) {
    runBuild({
      command: props.buildCommand,
      cwd: projectDir,
    });
  }

  // Default build output dirs per framework
  const buildOutputDir =
    props.buildOutputDir ?? getDefaultBuildOutputDir(framework);

  const absoluteBuildOutputDir = path.isAbsolute(buildOutputDir)
    ? buildOutputDir
    : path.join(projectDir, buildOutputDir);

  // Get the adapter (custom or registry) and run it to produce .amplify-hosting/
  const adapter = props.customAdapter ?? getAdapter(framework);
  const manifest = adapter(absoluteBuildOutputDir, projectDir);

  // Resolve paths
  const hostingOutputDir = getHostingOutputDir(projectDir);
  const staticAssetPath = path.join(hostingOutputDir, 'static');
  const computeBasePath = path.join(hostingOutputDir, 'compute');

  const constructProps: AmplifyHostingConstructProps = {
    manifest,
    staticAssetPath,
    computeBasePath,
    domain: props.domain,
    waf: props.waf,
    compute: props.compute,
    retainOnDelete: props.retainOnDelete,
    accessLogging: props.accessLogging,
    contentSecurityPolicy: props.contentSecurityPolicy,
    priceClass: props.priceClass,
    name,
  };

  const hostingConstruct = new AmplifyHostingConstruct(
    scope,
    name,
    constructProps,
  );

  Tags.of(hostingConstruct).add(TagName.FRIENDLY_NAME, name);

  return hostingConstruct.getResources();
};

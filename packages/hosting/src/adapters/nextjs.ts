/**
 * Next.js adapter using opennextjs/aws.
 *
 * Runs OpenNext build, reads .open-next/ output, translates to DeployManifest.
 * The output manifest is framework-agnostic — the L3 construct never knows this
 * came from Next.js.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { HostingError } from '../hosting_error.js';
import type {
  ComputeResource,
  DeployManifest,
  RouteBehavior,
} from '../manifest/types.js';

export type NextjsAdapterOptions = {
  /** Project root directory */
  projectDir: string;
  /** Custom open-next.config.ts path (relative to projectDir) */
  configPath?: string;
  /** Skip the OpenNext build step (use pre-existing .open-next/ output) */
  skipBuild?: boolean;
};

// ---- OpenNext output types (internal) ----

type OpenNextOutput = {
  origins?: Record<string, OpenNextOrigin>;
  behaviors?: OpenNextBehavior[];
  additionalProps?: {
    [key: string]: unknown;
    disableIncrementalCache?: boolean;
    imageOptimization?: boolean;
  };
};

type OpenNextOrigin = {
  type?: 'function' | 'ecs' | 'docker' | 'edge' | string;
  handler?: string;
  entrypoint?: string;
  port?: number;
  streaming?: boolean;
  runtime?: string;
  memorySize?: number;
  timeout?: number;
  environment?: Record<string, string>;
};

type OpenNextBehavior = {
  pattern: string;
  origin?: string;
  fallback?: string;
};

/**
 * Run the OpenNext build and translate its output into a DeployManifest.
 * @param options - Adapter options
 * @returns Framework-agnostic DeployManifest ready for the L3 construct
 */
export const nextjsAdapter = (
  options: NextjsAdapterOptions,
): DeployManifest => {
  const { projectDir, configPath, skipBuild } = options;

  const openNextDir = path.join(projectDir, '.open-next');
  const outputPath = path.join(openNextDir, 'open-next.output.json');

  if (!skipBuild) {
    runOpenNextBuild(projectDir, configPath);
  }

  // Ensure amplify_outputs.json is in every server function bundle.
  // Next.js outputFileTracingIncludes is unreliable across rebuild scenarios,
  // so we explicitly copy the file into the OpenNext output.
  copyAmplifyOutputsToServerBundles(projectDir, openNextDir);

  if (!fs.existsSync(outputPath)) {
    throw new HostingError('OpenNextOutputNotFoundError', {
      message: `OpenNext output not found at ${outputPath}. Did the build succeed?`,
      resolution:
        'Ensure @opennextjs/aws is installed and the build completed successfully. ' +
        'Run `npx @opennextjs/aws build` manually to diagnose build failures.',
    });
  }

  let output: OpenNextOutput;
  try {
    output = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  } catch (error) {
    throw new HostingError(
      'OpenNextOutputParseError',
      {
        message: `Failed to parse OpenNext output at ${outputPath}`,
        resolution:
          'The open-next.output.json file contains invalid JSON. Try running the build again.',
      },
      error as Error,
    );
  }

  return translateOpenNextOutput(output, openNextDir);
};

/**
 * Execute the OpenNext build command.
 *
 * Runs `npx @opennextjs/aws build` from the project directory. The consumer
 * project must have @opennextjs/aws installed as a devDependency — this avoids
 * bloating the hosting package for SPA/static users who don't need OpenNext.
 *
 * If @opennextjs/aws is not installed, npx will fail with a clear error.
 * We catch it and provide an actionable resolution message.
 */
const runOpenNextBuild = (projectDir: string, configPath?: string): void => {
  const args = ['@opennextjs/aws', 'build'];
  if (configPath) args.push('--config-path', configPath);

  process.stderr.write(
    `\u{1F528} Running OpenNext build: npx ${args.join(' ')}\n`,
  );

  try {
    execFileSync('npx', args, {
      cwd: projectDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '' },
    });
  } catch (error) {
    // Check if the error is because @opennextjs/aws is not installed
    const errMsg = (error as Error).message || '';
    if (
      errMsg.includes('not found') ||
      errMsg.includes('ERR_MODULE_NOT_FOUND') ||
      errMsg.includes('Cannot find package')
    ) {
      throw new HostingError(
        'OpenNextNotFoundError',
        {
          message:
            '@opennextjs/aws is not installed. Next.js hosting requires OpenNext to build and deploy your app.',
          resolution:
            'Add @opennextjs/aws to your project\'s devDependencies:\n\n' +
            '  npm install --save-dev @opennextjs/aws\n\n' +
            'Then re-run your deployment.',
        },
        error as Error,
      );
    }

    throw new HostingError(
      'OpenNextBuildError',
      {
        message: 'OpenNext build failed.',
        resolution:
          'Check the build output above for errors. Common issues:\n' +
          '  - Missing Next.js dependencies (run: npm install)\n' +
          '  - Invalid next.config.js\n' +
          '  - TypeScript compilation errors in your app\n' +
          '  - Missing .next/ directory (run: next build)',
      },
      error as Error,
    );
  }
};

/**
 * Copy amplify_outputs.json from the project root into all server function
 * bundle directories under .open-next/. This ensures the Lambda can read
 * backend configuration (auth, data, storage endpoints) at runtime regardless
 * of whether Next.js file tracing included the file.
 */
const copyAmplifyOutputsToServerBundles = (
  projectDir: string,
  openNextDir: string,
): void => {
  const outputsFile = path.join(projectDir, 'amplify_outputs.json');
  if (!fs.existsSync(outputsFile)) {
    return;
  }

  const targets: string[] = [];

  // Single server function directory
  const singleFn = path.join(openNextDir, 'server-function');
  if (fs.existsSync(singleFn)) {
    targets.push(singleFn);
  }

  // Multi-function directory (server-functions/<name>/)
  const multiFnDir = path.join(openNextDir, 'server-functions');
  if (fs.existsSync(multiFnDir)) {
    for (const entry of fs.readdirSync(multiFnDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        targets.push(path.join(multiFnDir, entry.name));
      }
    }
  }

  for (const target of targets) {
    const dest = path.join(target, 'amplify_outputs.json');
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(outputsFile, dest);
      process.stderr.write(
        `\u{1F4E6} Copied amplify_outputs.json → ${path.relative(projectDir, dest)}\n`,
      );
    }

    // Also copy into .next/standalone/ if it exists — some OpenNext versions
    // set the Next.js server root there, so page components resolve paths
    // relative to that subtree.
    const standaloneDest = path.join(
      target,
      '.next',
      'standalone',
      'amplify_outputs.json',
    );
    if (
      fs.existsSync(path.dirname(standaloneDest)) &&
      !fs.existsSync(standaloneDest)
    ) {
      fs.copyFileSync(outputsFile, standaloneDest);
      process.stderr.write(
        `\u{1F4E6} Copied amplify_outputs.json → ${path.relative(projectDir, standaloneDest)}\n`,
      );
    }
  }
};

/**
 * Translate OpenNext output structure into our framework-agnostic DeployManifest.
 */
const translateOpenNextOutput = (
  output: OpenNextOutput,
  openNextDir: string,
): DeployManifest => {
  const manifest: DeployManifest = {
    version: 1,
    compute: {},
    staticAssets: {
      directory: path.join(openNextDir, 'assets'),
    },
    routes: [],
  };

  // Map server functions (origins) to compute resources
  if (output.origins) {
    for (const [name, origin] of Object.entries(output.origins)) {
      // Skip S3 origin and imageOptimizer (handled separately via manifest.imageOptimization)
      if (name === 's3' || name === 'imageOptimizer') continue;

      const computeResource = mapOriginToCompute(name, origin, openNextDir);
      if (computeResource) {
        manifest.compute[name] = computeResource;
      }
    }
  }

  // Map behaviors to routes
  if (output.behaviors) {
    manifest.routes = mapBehaviorsToRoutes(output.behaviors);
  }

  // ISR/Cache detection — only provision cache infra if ISR is actually used.
  // Evidence: revalidation-function exists OR cache handler dir exists in output.
  if (output.additionalProps?.disableIncrementalCache !== true) {
    const revalidationFnDir = path.join(openNextDir, 'revalidation-function');
    const hasRevalidationFn = fs.existsSync(revalidationFnDir);
    const hasIsrEvidence =
      hasRevalidationFn || fs.existsSync(path.join(openNextDir, 'cache'));

    if (hasIsrEvidence) {
      const computeNames = Object.keys(manifest.compute);
      const primaryComputeName =
        computeNames.find((n) => n === 'default' || n === 'server') ??
        computeNames[0];
      if (primaryComputeName) {
        manifest.cache = {
          computeResource: primaryComputeName,
          tagRevalidation: true,
          revalidationQueue: true,
          revalidationFunction: hasRevalidationFn
            ? { bundle: revalidationFnDir, handler: 'index.handler' }
            : undefined,
        };
      }
    }
  }

  // Image optimization
  if (output.additionalProps?.imageOptimization !== false) {
    const imgDir = path.join(openNextDir, 'image-optimization-function');
    if (fs.existsSync(imgDir)) {
      const imgConfig = tryReadJson(path.join(imgDir, 'config.json'));
      manifest.imageOptimization = {
        bundle: imgDir,
        handler: 'index.handler',
        formats: (imgConfig?.formats as string[] | undefined) ?? [
          'webp',
          'avif',
        ],
        sizes: (imgConfig?.sizes as number[] | undefined) ?? [
          640, 750, 828, 1080, 1200, 1920, 2048, 3840,
        ],
      };
    }
  }

  // Middleware
  const middlewareDir = path.join(openNextDir, 'middleware');
  if (fs.existsSync(middlewareDir)) {
    const middlewareManifest = tryReadJson(
      path.join(middlewareDir, 'manifest.json'),
    );
    manifest.middleware = {
      bundle: middlewareDir,
      handler: 'handler.handler',
      matchers: (middlewareManifest?.matchers as string[] | undefined) ?? [
        '/*',
      ],
    };
  }

  return manifest;
};

/**
 * Map an OpenNext origin to a ComputeResource.
 */
const mapOriginToCompute = (
  name: string,
  origin: OpenNextOrigin,
  openNextDir: string,
): ComputeResource | undefined => {
  const bundleDir = path.join(openNextDir, 'server-functions', name);

  const effectiveBundle = fs.existsSync(bundleDir)
    ? bundleDir
    : path.join(openNextDir, 'server-function');

  if (!fs.existsSync(effectiveBundle)) {
    return undefined;
  }

  if (origin.type === 'function' || origin.type === undefined) {
    return {
      type: 'handler',
      bundle: effectiveBundle,
      handler: origin.handler ?? 'index.handler',
      placement: 'regional',
      streaming: origin.streaming ?? true,
      runtime: origin.runtime ?? 'nodejs20.x',
      memorySize: origin.memorySize,
      timeout: origin.timeout,
      environment: origin.environment,
    };
  }

  if (origin.type === 'ecs' || origin.type === 'docker') {
    return {
      type: 'http-server',
      bundle: effectiveBundle,
      entrypoint: origin.entrypoint ?? 'server.js',
      port: origin.port ?? 3000,
      placement: 'regional',
      streaming: origin.streaming ?? false,
      runtime: origin.runtime ?? 'nodejs20.x',
      environment: origin.environment,
    };
  }

  if (origin.type === 'edge') {
    return {
      type: 'edge',
      bundle: effectiveBundle,
      handler: origin.handler ?? 'index.handler',
      placement: 'global',
      streaming: false,
      runtime: origin.runtime ?? 'nodejs20.x',
      environment: origin.environment,
    };
  }

  // Unknown type — treat as handler
  return {
    type: 'handler',
    bundle: effectiveBundle,
    handler: 'index.handler',
    placement: 'regional',
    streaming: origin.streaming ?? true,
    runtime: 'nodejs20.x',
  };
};

/**
 * Normalize OpenNext origin names to match the construct's compute resource keys.
 */
const normalizeOriginName = (name: string): string => {
  const originNameMap: Record<string, string> = {
    imageOptimizer: 'image-optimization',
  };
  return originNameMap[name] ?? name;
};

/**
 * Map OpenNext behaviors to RouteBehavior array.
 */
const mapBehaviorsToRoutes = (
  behaviors: OpenNextBehavior[],
): RouteBehavior[] => {
  const routes: RouteBehavior[] = [];

  for (const behavior of behaviors) {
    routes.push({
      pattern: behavior.pattern,
      target: normalizeOriginName(behavior.origin ?? 'default'),
      fallback: behavior.fallback,
    });
  }

  // Ensure a catch-all exists
  const hasCatchAll = routes.some(
    (r) => r.pattern === '/*' || r.pattern === '*',
  );
  if (!hasCatchAll && routes.length > 0) {
    routes.push({
      pattern: '/*',
      target: 'default',
    });
  }

  return routes;
};

/**
 * Safely read and parse a JSON file, returning undefined on failure.
 */
const tryReadJson = (filePath: string): Record<string, unknown> | undefined => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
  } catch {
    // Ignore parse errors — caller handles undefined
  }
  return undefined;
};

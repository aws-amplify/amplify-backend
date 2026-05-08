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
  const { projectDir, configPath } = options;

  const openNextDir = path.join(projectDir, '.open-next');
  const outputPath = path.join(openNextDir, 'open-next.output.json');

  // Always run the OpenNext build — it handles caching/rebuilding internally
  runOpenNextBuild(projectDir, configPath);

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
 * Resolve the path to the OpenNext CLI binary from the hosting package's dependencies.
 * @internal
 */
const resolveOpenNextBinary = (): string => {
  try {
    // Try to resolve from node_modules using the package.json main field
    // For ESM modules, we need to handle the path resolution carefully
    const packageJsonPath = require.resolve('@opennextjs/aws/package.json');
    const packageDir = path.dirname(packageJsonPath);
    return path.join(packageDir, 'dist', 'index.js');
  } catch {
    // Fallback: try to find it in common locations
    // This handles cases where require.resolve fails with ESM modules
    const possiblePaths = [
      path.join(
        __dirname,
        '..',
        '..',
        'node_modules',
        '@opennextjs',
        'aws',
        'dist',
        'index.js',
      ),
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        'node_modules',
        '@opennextjs',
        'aws',
        'dist',
        'index.js',
      ),
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'node_modules',
        '@opennextjs',
        'aws',
        'dist',
        'index.js',
      ),
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }

    throw new HostingError(
      'OpenNextNotFoundError',
      {
        message:
          '@opennextjs/aws is not installed in the hosting package dependencies.',
        resolution:
          'This is a bug in the hosting package setup. ' +
          'Ensure @opennextjs/aws is listed in packages/hosting/package.json dependencies.',
      },
      new Error('Could not resolve @opennextjs/aws'),
    );
  }
};

/**
 * Execute the OpenNext build command.
 *
 * Resolves @opennextjs/aws from the hosting package's own node_modules
 * (pinned to 3.10.x) rather than using npx which would download the latest.
 * This ensures consistent behavior regardless of the consumer project's dependencies.
 */
const runOpenNextBuild = (projectDir: string, configPath?: string): void => {
  const opennextBin = resolveOpenNextBinary();

  const execArgs = [opennextBin, 'build'];
  if (configPath) execArgs.push('--config-path', configPath);

  process.stderr.write(
    `\u{1F528} Running OpenNext build: node ${execArgs.join(' ')}\n`,
  );

  try {
    execFileSync('node', execArgs, {
      cwd: projectDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '' },
    });
  } catch (error) {
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
      if (name === 's3') continue;

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
    const hasIsrEvidence =
      fs.existsSync(path.join(openNextDir, 'revalidation-function')) ||
      fs.existsSync(path.join(openNextDir, 'cache'));

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
 * Map OpenNext behaviors to RouteBehavior array.
 */
const mapBehaviorsToRoutes = (
  behaviors: OpenNextBehavior[],
): RouteBehavior[] => {
  const routes: RouteBehavior[] = [];

  for (const behavior of behaviors) {
    routes.push({
      pattern: behavior.pattern,
      target: behavior.origin ?? 'default',
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

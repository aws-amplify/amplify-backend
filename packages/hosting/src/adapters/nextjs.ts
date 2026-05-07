/**
 * Next.js adapter using opennextjs/aws.
 *
 * Runs OpenNext build, reads .open-next/ output, translates to DeployManifest.
 * The output manifest is framework-agnostic — the L3 construct never knows this
 * came from Next.js.
 */
import { execSync } from 'child_process';
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
  /** Skip running the OpenNext build (if already built) */
  skipBuild?: boolean;
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
  const { projectDir, skipBuild, configPath } = options;

  if (!skipBuild) {
    runOpenNextBuild(projectDir, configPath);
  }

  const openNextDir = path.join(projectDir, '.open-next');
  const outputPath = path.join(openNextDir, 'open-next.output.json');

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
 */
const runOpenNextBuild = (projectDir: string, configPath?: string): void => {
  const args = configPath ? `--config-path ${configPath}` : '';
  const command = `npx @opennextjs/aws build ${args}`.trim();

  process.stderr.write(`\u{1F528} Running OpenNext build: ${command}\n`);

  try {
    execSync(command, {
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
          '  - Missing @opennextjs/aws dependency (run: npm install @opennextjs/aws)\n' +
          '  - Invalid next.config.js\n' +
          '  - TypeScript compilation errors in your app',
      },
      error as Error,
    );
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

  // ISR/Cache detection
  if (output.additionalProps?.disableIncrementalCache !== true) {
    const hasCache = Object.keys(manifest.compute).length > 0;
    if (hasCache) {
      manifest.cache = {
        computeResource: 'default',
        tagRevalidation: true, // eslint-disable-line spellcheck/spell-checker
        revalidationQueue: true, // eslint-disable-line spellcheck/spell-checker
      };
    }
  }

  // Image optimization
  if (output.additionalProps?.imageOptimization !== false) {
    const imgDir = path.join(openNextDir, 'image-optimization-function');
    if (fs.existsSync(imgDir)) {
      manifest.imageOptimization = {
        bundle: imgDir,
        handler: 'index.handler',
        formats: ['webp', 'avif'], // eslint-disable-line spellcheck/spell-checker
        sizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
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

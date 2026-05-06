/**
 * OpenNext Output → DeployManifest v2 Translation
 *
 * Translates the OpenNext `.open-next/open-next.output.json` into our
 * framework-agnostic DeployManifest v2 format. The L3 construct only
 * understands DeployManifest v2 — it never sees OpenNext types.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CacheConfig,
  DeployManifestV2,
  ImageOptimizationConfig,
  MiddlewareConfig,
  RouteEntry,
  RouteType,
  ServerFunction,
  StaticAssetConfig,
} from '../../manifest/deploy_manifest.js';
import {
  OpenNextBehavior,
  OpenNextOutput,
  OpenNextServerFunctionOrigin,
  OpenNextServerECSOrigin,
} from './types.js';

/**
 * Translate a complete OpenNext output into a DeployManifest v2.
 *
 * This is the core translation function. It maps:
 * - OpenNext behaviors → DeployManifest routes
 * - OpenNext origins → DeployManifest server functions
 * - OpenNext additional props → cache/image config
 *
 * @param output - Parsed OpenNext output manifest.
 * @param projectDir - Absolute path to the project root.
 * @param nextVersion - Detected Next.js version (for metadata).
 * @returns A complete DeployManifest v2.
 */
export const translateToManifest = (
  output: OpenNextOutput,
  projectDir: string,
  nextVersion?: string,
): DeployManifestV2 => {
  const routes = translateBehaviors(output);
  const serverFunctions = translateOrigins(output, nextVersion);
  const staticAssets = translateStaticAssets(output);
  const cacheConfig = translateCacheConfig(output);
  const imageOptimization = translateImageConfig(output);
  const middleware = translateMiddleware(output);

  const manifest: DeployManifestV2 = {
    version: 2,
    routes,
    staticAssets,
    serverFunctions,
    cache: cacheConfig,
    imageOptimization,
    middleware,
    framework: {
      name: 'nextjs',
      version: nextVersion,
      adapterVersion: '2.0.0-opennext',
    },
  };

  // Read build ID if available
  const buildIdPath = path.join(projectDir, '.next', 'BUILD_ID');
  if (fs.existsSync(buildIdPath)) {
    manifest.buildId = fs.readFileSync(buildIdPath, 'utf-8').trim();
  }

  return manifest;
};

/**
 * Translate OpenNext behaviors into DeployManifest route entries.
 *
 * Behaviors define CloudFront cache behavior patterns. We map them
 * to our generic route format with type classification.
 */
const translateBehaviors = (output: OpenNextOutput): RouteEntry[] => {
  const routes: RouteEntry[] = [];

  for (const behavior of output.behaviors) {
    const route = translateBehavior(behavior, output);
    if (route) {
      routes.push(route);
    }
  }

  return routes;
};

/**
 * Translate a single OpenNext behavior to a RouteEntry.
 */
const translateBehavior = (
  behavior: OpenNextBehavior,
  output: OpenNextOutput,
): RouteEntry | undefined => {
  const { pattern, origin } = behavior;

  // Normalize pattern to a path
  const routePath = normalizePattern(pattern);

  // Determine the route type based on origin
  const routeType = classifyBehavior(behavior, output);

  const entry: RouteEntry = {
    path: routePath,
    type: routeType,
  };

  // Static routes served from S3 don't need a function
  if (routeType === 'static') {
    if (pattern.includes('_next/static') || pattern.includes('_next/data')) {
      entry.cacheControl = 'public, max-age=31536000, immutable';
    }
    return entry;
  }

  // Server-side routes reference a function
  if (origin && origin !== 's3') {
    entry.functionName = origin === 'imageOptimizer' ? 'image-optimizer' : origin;
  }

  return entry;
};

/**
 * Classify a behavior into a route type.
 */
const classifyBehavior = (
  behavior: OpenNextBehavior,
  output: OpenNextOutput,
): RouteType => {
  const { origin, pattern } = behavior;

  // S3 origin = static
  if (origin === 's3') {
    return 'static';
  }

  // Image optimizer is an API-like function
  if (origin === 'imageOptimizer') {
    return 'api';
  }

  // Patterns that look like static assets
  if (isStaticPattern(pattern)) {
    return 'static';
  }

  // API routes
  if (isApiPattern(pattern)) {
    return 'api';
  }

  // Check if the origin's incremental cache is disabled
  if (origin && origin in output.origins) {
    const originDef = output.origins[origin];
    if (originDef && 'incrementalCache' in originDef) {
      const serverOrigin = originDef as OpenNextServerFunctionOrigin | OpenNextServerECSOrigin;
      if (serverOrigin.incrementalCache === 'dummy') {
        return 'ssr';
      }
    }
  }

  // Default: SSR (OpenNext handles ISR internally via its cache layer)
  return 'ssr';
};

/**
 * Check if a pattern matches static asset patterns.
 */
const isStaticPattern = (pattern: string): boolean => {
  const staticPatterns = [
    '_next/static',
    'favicon.ico',
    'robots.txt',
    'sitemap.xml',
    '.well-known',
  ];
  return staticPatterns.some((sp) => pattern.includes(sp));
};

/**
 * Check if a pattern matches API route patterns.
 */
const isApiPattern = (pattern: string): boolean => {
  return pattern.startsWith('api/') || pattern.startsWith('api*') ||
    pattern.includes('/api/') || pattern === '_next/image*';
};

/**
 * Normalize an OpenNext CloudFront pattern to a route path.
 *
 * OpenNext patterns are CloudFront-style (e.g., "_next/static/*", "*")
 * and our routes use path-style (e.g., "/_next/static/*", "/*").
 */
const normalizePattern = (pattern: string): string => {
  // Ensure leading slash
  const withSlash = pattern.startsWith('/') ? pattern : `/${pattern}`;
  return withSlash;
};

/**
 * Translate OpenNext origins into ServerFunction definitions.
 */
const translateOrigins = (
  output: OpenNextOutput,
  nextVersion?: string,
): ServerFunction[] => {
  const functions: ServerFunction[] = [];
  const runtime = selectRuntime(nextVersion);

  // Default server function
  const defaultOrigin = output.origins.default;
  if (defaultOrigin) {
    const isStreaming = defaultOrigin.type === 'function'
      ? (defaultOrigin as OpenNextServerFunctionOrigin).streaming ?? false
      : false;

    functions.push({
      name: 'default',
      handler: defaultOrigin.type === 'function'
        ? (defaultOrigin as OpenNextServerFunctionOrigin).handler
        : 'index.handler',
      runtime,
      timeout: 30,
      memorySize: 512,
      environment: {
        NODE_ENV: 'production',
        ...(isStreaming ? { AWS_LWA_INVOKE_MODE: 'response_stream' } : {}),
      },
      srcDir: defaultOrigin.bundle || 'compute/default',
    });
  }

  // Image optimization function
  const imageOrigin = output.origins.imageOptimizer;
  if (imageOrigin) {
    functions.push({
      name: 'image-optimizer',
      handler: imageOrigin.type === 'function' ? imageOrigin.handler : 'index.handler',
      runtime,
      timeout: 25,
      memorySize: 1024,
      environment: {
        NODE_ENV: 'production',
      },
      srcDir: imageOrigin.bundle || 'compute/image-optimizer',
    });
  }

  // Additional split functions
  for (const [name, origin] of Object.entries(output.origins)) {
    if (name === 's3' || name === 'default' || name === 'imageOptimizer') {
      continue;
    }
    if (origin.type === 'function' || origin.type === 'ecs') {
      functions.push({
        name,
        handler: origin.type === 'function'
          ? (origin as OpenNextServerFunctionOrigin).handler
          : 'index.handler',
        runtime,
        timeout: 30,
        memorySize: 512,
        environment: { NODE_ENV: 'production' },
        srcDir: origin.bundle || `compute/${name}`,
      });
    }
  }

  return functions;
};

/**
 * Select the appropriate Lambda runtime based on Next.js version.
 */
const selectRuntime = (
  nextVersion?: string,
): 'nodejs18.x' | 'nodejs20.x' | 'nodejs22.x' => {
  if (!nextVersion) {
    return 'nodejs20.x';
  }
  const major = parseInt(nextVersion.split('.')[0], 10);
  if (major >= 16) {
    return 'nodejs22.x';
  }
  return 'nodejs20.x';
};

/**
 * Translate OpenNext S3 origin config into static asset configuration.
 */
const translateStaticAssets = (output: OpenNextOutput): StaticAssetConfig => {
  const s3Origin = output.origins.s3;

  // The S3 origin copy definitions tell us where assets come from
  const baseDir = s3Origin?.originPath || '_assets';

  return {
    baseDir,
    cacheControl: 'public, max-age=31536000, immutable',
  };
};

/**
 * Translate OpenNext cache settings to our CacheConfig.
 */
const translateCacheConfig = (output: OpenNextOutput): CacheConfig | undefined => {
  const props = output.additionalProps;

  // If incremental cache is disabled, no cache config needed
  if (props?.disableIncrementalCache) {
    return undefined;
  }

  // Check if default origin has a non-dummy incremental cache
  const defaultOrigin = output.origins.default;
  if (defaultOrigin && 'incrementalCache' in defaultOrigin) {
    const serverOrigin = defaultOrigin as OpenNextServerFunctionOrigin | OpenNextServerECSOrigin;
    if (serverOrigin.incrementalCache === 'dummy') {
      return undefined;
    }
  }

  return {
    enabled: true,
    storage: 's3+dynamodb',
    tagTracking: !props?.disableTagCache,
  };
};

/**
 * Translate image optimization config.
 */
const translateImageConfig = (output: OpenNextOutput): ImageOptimizationConfig | undefined => {
  const imageOrigin = output.origins.imageOptimizer;
  if (!imageOrigin) {
    return undefined;
  }

  return {
    enabled: true,
    memorySize: 1024,
  };
};

/**
 * Translate middleware configuration.
 */
const translateMiddleware = (output: OpenNextOutput): MiddlewareConfig | undefined => {
  const middleware = output.edgeFunctions.middleware;
  if (!middleware) {
    return undefined;
  }

  return {
    src: middleware.bundle || '.open-next/middleware',
  };
};

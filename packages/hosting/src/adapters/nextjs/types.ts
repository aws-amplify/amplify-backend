/**
 * Types representing the OpenNext build output and legacy Next.js manifests.
 *
 * OpenNext (`@opennextjs/aws`) produces `.open-next/open-next.output.json`
 * after running its build. These types model that output so our adapter
 * can translate it into the framework-agnostic DeployManifest v2.
 *
 * Legacy manifest types are retained for fallback scenarios where OpenNext
 * output is unavailable (e.g., testing with pre-built .next directories).
 */

// ─── OpenNext Output Types ───────────────────────────────────────────────────

/**
 * Base function reference in OpenNext output.
 */
export type OpenNextBaseFunction = {
  handler: string;
  bundle: string;
};

/**
 * A Lambda function origin in the OpenNext output.
 */
export type OpenNextFunctionOrigin = {
  type: 'function';
  streaming?: boolean;
  wrapper: string;
  converter: string;
  handler: string;
  bundle: string;
};

/**
 * An ECS origin in the OpenNext output.
 */
export type OpenNextECSOrigin = {
  type: 'ecs';
  bundle: string;
  wrapper: string;
  converter: string;
  dockerfile: string;
};

/**
 * Common overrides applied to server function/ECS origins.
 */
export type OpenNextCommonOverride = {
  queue: string;
  incrementalCache: string;
  tagCache: string;
};

/**
 * Server function origin (Lambda + overrides).
 */
export type OpenNextServerFunctionOrigin = OpenNextFunctionOrigin & OpenNextCommonOverride;

/**
 * Server ECS origin (ECS + overrides).
 */
export type OpenNextServerECSOrigin = OpenNextECSOrigin & OpenNextCommonOverride;

/**
 * S3 static asset origin.
 */
export type OpenNextS3Origin = {
  type: 's3';
  originPath: string;
  copy: Array<{
    from: string;
    to: string;
    cached: boolean;
    versionedSubDir?: string;
  }>;
};

/**
 * Image optimization origin.
 */
export type OpenNextImageOrigin = (OpenNextFunctionOrigin | OpenNextECSOrigin) & {
  imageLoader: string;
};

/**
 * Union of all possible origin types.
 */
export type OpenNextOrigin =
  | OpenNextServerFunctionOrigin
  | OpenNextServerECSOrigin
  | OpenNextS3Origin;

/**
 * A behavior entry mapping a URL pattern to an origin and/or edge function.
 */
export type OpenNextBehavior = {
  pattern: string;
  origin?: string;
  edgeFunction?: string;
};

/**
 * Additional props in the OpenNext output for supplementary infrastructure.
 */
export type OpenNextAdditionalProps = {
  disableIncrementalCache?: boolean;
  disableTagCache?: boolean;
  initializationFunction?: OpenNextBaseFunction;
  warmer?: OpenNextBaseFunction;
  revalidationFunction?: OpenNextBaseFunction;
};

/**
 * Middleware edge function definition (extends base with pathResolver).
 */
export type OpenNextMiddlewareFunction = OpenNextBaseFunction & {
  pathResolver: string;
};

/**
 * Edge functions map — keys are function names, values are function definitions.
 * The special `middleware` key has an extended type.
 */
export type OpenNextEdgeFunctions = {
  [key: string]: OpenNextBaseFunction | OpenNextMiddlewareFunction | undefined;
  middleware?: OpenNextMiddlewareFunction;
};

/**
 * The complete `.open-next/open-next.output.json` schema.
 *
 * This is what OpenNext writes after `npx open-next build`.
 */
export type OpenNextOutput = {
  edgeFunctions: OpenNextEdgeFunctions;
  origins: {
    [key: string]: OpenNextOrigin | OpenNextImageOrigin;
    s3: OpenNextS3Origin;
    default: OpenNextServerFunctionOrigin | OpenNextServerECSOrigin;
    imageOptimizer: OpenNextImageOrigin;
  };
  behaviors: OpenNextBehavior[];
  additionalProps?: OpenNextAdditionalProps;
};

// ─── Legacy Next.js Manifest Types ──────────────────────────────────────────
// Retained for reading .next/ manifests in fallback/validation scenarios.

/**
 * Entry in the prerender-manifest.json `routes` map.
 */
export type PrerenderRoute = {
  initialRevalidateSeconds: number | false;
  srcRoute: string | null;
  dataRoute: string | null;
  prefetchDataRoute?: string | null;
  experimentalPPR?: boolean;
};

/**
 * Entry in the prerender-manifest.json `dynamicRoutes` map.
 */
export type PrerenderDynamicRoute = {
  routeRegex: string;
  fallback: string | false | null;
  dataRoute: string | null;
  dataRouteRegex: string | null;
  prefetchDataRoute?: string | null;
  prefetchDataRouteRegex?: string | null;
};

/**
 * The `.next/prerender-manifest.json` file produced by Next.js build.
 */
export type PrerenderManifest = {
  version: number;
  routes: Record<string, PrerenderRoute>;
  dynamicRoutes: Record<string, PrerenderDynamicRoute>;
  notFoundRoutes?: string[];
  preview?: {
    previewModeId: string;
    previewModeSigningKey: string;
    previewModeEncryptionKey: string;
  };
};

/**
 * A single route entry in `routes-manifest.json`.
 */
export type RoutesManifestRoute = {
  source: string;
  destination?: string;
  statusCode?: number;
  permanent?: boolean;
  regex: string;
  locale?: false;
  headers?: Array<{ key: string; value: string }>;
  basePath?: false;
  internal?: boolean;
  has?: Array<{
    type: 'header' | 'cookie' | 'query' | 'host';
    key: string;
    value?: string;
  }>;
  missing?: Array<{
    type: 'header' | 'cookie' | 'query' | 'host';
    key: string;
    value?: string;
  }>;
};

/**
 * The `.next/routes-manifest.json` file produced by Next.js build.
 */
export type RoutesManifest = {
  version: number;
  basePath?: string;
  redirects: RoutesManifestRoute[];
  headers: RoutesManifestRoute[];
  rewrites?:
    | RoutesManifestRoute[]
    | {
        beforeFiles: RoutesManifestRoute[];
        afterFiles: RoutesManifestRoute[];
        fallback: RoutesManifestRoute[];
      };
  dynamicRoutes: Array<{
    page: string;
    regex: string;
    namedRegex?: string;
    routeKeys?: Record<string, string>;
  }>;
  staticRoutes: Array<{
    page: string;
    regex: string;
    namedRegex?: string;
    routeKeys?: Record<string, string>;
  }>;
  dataRoutes?: Array<{
    page: string;
    dataRouteRegex: string;
    routeKeys?: Record<string, string>;
    namedDataRouteRegex?: string;
  }>;
  i18n?: {
    locales: string[];
    defaultLocale: string;
    domains?: Array<{
      domain: string;
      defaultLocale: string;
      locales?: string[];
    }>;
  };
};

/**
 * The `.next/app-paths-manifest.json` file (App Router).
 */
export type AppPathsManifest = Record<string, string>;

/**
 * The `.next/server/middleware-manifest.json` file.
 */
export type MiddlewareManifest = {
  version: number;
  sortedMiddleware: string[];
  middleware: Record<
    string,
    {
      files: string[];
      name: string;
      page: string;
      matchers: Array<{
        regexp: string;
        originalSource: string;
      }>;
      wasm: unknown[];
      assets: unknown[];
    }
  >;
  functions?: Record<string, unknown>;
};

/**
 * Summary of a Next.js build output for adapter consumption.
 */
export type NextjsBuildDescription = {
  prerenderManifest: PrerenderManifest;
  routesManifest: RoutesManifest;
  appPathsManifest?: AppPathsManifest;
  middlewareManifest?: MiddlewareManifest;
  buildOutputDir: string;
  projectDir: string;
  nextVersion?: string;
};

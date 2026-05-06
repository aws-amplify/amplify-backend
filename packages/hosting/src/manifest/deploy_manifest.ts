/**
 * Deploy Manifest v2 — Framework-Agnostic Schema
 *
 * This is the canonical manifest format that the L3 hosting construct reads.
 * Framework adapters (Next.js, Remix, etc.) produce this manifest from their
 * respective build outputs. The construct doesn't know or care which framework
 * generated the manifest — it only operates on this schema.
 * @example
 * ```typescript
 * const manifest: DeployManifest = {
 *   version: 2,
 *   routes: [...],
 *   staticAssets: { baseDir: '_next/static', cacheControl: 'immutable' },
 *   serverFunctions: [{ name: 'default', handler: 'run.sh', runtime: 'nodejs20.x' }],
 * };
 * ```
 */

/**
 * Route type classification for CDN behavior configuration.
 *
 * - `static`: Served directly from S3 via CloudFront (no origin request to Lambda)
 * - `ssr`: Server-side rendered on every request via Lambda
 * - `isr`: Incrementally regenerated — cached with a revalidation period
 * - `api`: API route handled by Lambda (no HTML response expected)
 */
export type RouteType = 'static' | 'ssr' | 'isr' | 'api';

/**
 * A single route entry in the deploy manifest.
 *
 * Each route maps a URL pattern to a handling strategy. The L3 construct
 * translates these into CloudFront cache behaviors and Lambda function associations.
 */
export type RouteEntry = {
  /** URL path pattern (e.g., '/', '/blog/[slug]', '/api/*'). Must start with '/'. */
  path: string;

  /** How this route should be handled. */
  type: RouteType;

  /**
   * For ISR routes: revalidation period in seconds.
   * After this period, the cached response is considered stale and
   * the next request triggers background regeneration.
   */
  revalidate?: number;

  /**
   * Tags for on-demand revalidation.
   * Used by the cache handler to invalidate specific routes when
   * `revalidateTag()` is called from the application.
   */
  tags?: string[];

  /**
   * Name of the server function that handles this route.
   * Must reference a `ServerFunction.name` in the manifest.
   * Only applicable for 'ssr', 'isr', and 'api' route types.
   */
  functionName?: string;

  /**
   * Cache-Control header override for this specific route.
   * If not set, defaults are applied based on route type:
   * - static: public, max-age=31536000, immutable
   * - ssr: no-cache, no-store
   * - isr: s-maxage=<revalidate>, stale-while-revalidate
   */
  cacheControl?: string;
}

/**
 * Configuration for static asset serving.
 */
export type StaticAssetConfig = {
  /** Base directory for static assets relative to the hosting output. */
  baseDir: string;

  /**
   * Cache-Control header for static assets.
   * @default 'public, max-age=31536000, immutable'
   */
  cacheControl?: string;

  /** File patterns to include (glob). If not specified, all files are included. */
  include?: string[];

  /** File patterns to exclude (glob). */
  exclude?: string[];
}

/**
 * A server function (Lambda) in the deployment.
 *
 * Each function represents a separate Lambda function that the L3 construct
 * provisions. Most Next.js apps need only one ('default'), but advanced
 * configurations may split middleware or API routes into separate functions.
 */
export type ServerFunction = {
  /** Unique name for this function. Used to reference from routes. */
  name: string;

  /**
   * Handler entrypoint relative to the function's directory.
   * For Lambda Web Adapter: 'run.sh'
   * For native handlers: 'index.handler'
   */
  handler: string;

  /** Lambda runtime. */
  runtime: 'nodejs18.x' | 'nodejs20.x' | 'nodejs22.x';

  /** Lambda timeout in seconds. @default 30 */
  timeout?: number;

  /** Lambda memory size in MB. @default 512 */
  memorySize?: number;

  /** Environment variables to set on the Lambda function. */
  environment?: Record<string, string>;

  /**
   * Directory containing the function code relative to the hosting output.
   * @default `compute/${name}`
   */
  srcDir?: string;
}

/**
 * Cache configuration for ISR and data caching.
 *
 * When enabled, the L3 construct provisions the required infrastructure
 * (DynamoDB table for cache entries, S3 for large payloads) and injects
 * the connection details into the server function's environment.
 */
export type CacheConfig = {
  /** Whether ISR/data caching is enabled. */
  enabled: boolean;

  /**
   * Storage backend for cached data.
   * - 's3': Large payloads stored in S3 (good for full-page HTML)
   * - 'dynamodb': Fast access for small payloads (good for data cache)
   * - 's3+dynamodb': Hybrid — metadata in DynamoDB, payloads in S3
   * @default 's3+dynamodb'
   */
  storage?: 's3' | 'dynamodb' | 's3+dynamodb';

  /**
   * Whether to track cache tags for on-demand revalidation.
   * When enabled, the construct provisions a DynamoDB table to map
   * tags → cache keys for efficient invalidation.
   * @default true when any ISR routes exist
   */
  tagTracking?: boolean;

  /** Default TTL in seconds for cache entries without explicit revalidation. */
  defaultTtl?: number;
}

/**
 * Image optimization configuration.
 *
 * When present, the L3 construct provisions an image optimization Lambda
 * and configures CloudFront to route `/_next/image` requests to it.
 */
export type ImageOptimizationConfig = {
  /** Whether image optimization is enabled. */
  enabled: boolean;

  /** Allowed image widths (from next.config.js images.sizes). */
  sizes?: number[];

  /** Allowed remote image domains. */
  domains?: string[];

  /** Image formats to serve (e.g., ['webp', 'avif']). */
  formats?: string[];

  /** Memory size for the image optimization Lambda. @default 1024 */
  memorySize?: number;
}

/**
 * Middleware configuration.
 *
 * Describes edge middleware that runs before route handling.
 * The L3 construct provisions this as a CloudFront Function or Lambda@Edge.
 */
export type MiddlewareConfig = {
  /** Source file for the middleware. */
  src: string;

  /** Path patterns this middleware applies to. If empty, applies to all routes. */
  matchers?: string[];
}

/**
 * HTTP redirect rule.
 */
export type Redirect = {
  /** Source path pattern. */
  source: string;

  /** Destination URL or path. */
  destination: string;

  /** HTTP status code (301 permanent, 302 temporary, 307, 308). */
  statusCode: 301 | 302 | 307 | 308;

  /** Whether this redirect only applies to a specific locale. */
  locale?: string;
}

/**
 * URL rewrite rule (internal — does not change the browser URL).
 */
export type Rewrite = {
  /** Source path pattern. */
  source: string;

  /** Destination path (internal rewrite target). */
  destination: string;

  /** Whether this rewrite only applies to a specific locale. */
  locale?: string;
}

/**
 * Custom HTTP header rule.
 */
export type HeaderRule = {
  /** Path pattern this header applies to. */
  source: string;

  /** Headers to set on matching responses. */
  headers: Array<{ key: string; value: string }>;
}

/**
 * Framework metadata — informational only.
 * Used for telemetry and diagnostics, not for routing decisions.
 */
export type FrameworkInfo = {
  /** Framework name (e.g., 'nextjs', 'remix', 'astro'). */
  name: string;

  /** Framework version (e.g., '16.2.0'). */
  version?: string;

  /** Adapter version that produced this manifest. */
  adapterVersion?: string;
}

/**
 * Deploy Manifest v2 — the complete deployment descriptor.
 *
 * This is the single contract between framework adapters and the L3 hosting construct.
 * Adapters produce it; the construct consumes it. No framework-specific logic
 * should ever leak into the construct.
 */
export type DeployManifestV2 = {
  /** Schema version — always 2 for this format. */
  version: 2;

  /** All routes in priority order (first match wins). */
  routes: RouteEntry[];

  /** Static asset configuration. */
  staticAssets: StaticAssetConfig;

  /** Server functions to deploy (at least one for SSR/ISR apps). */
  serverFunctions: ServerFunction[];

  /** Cache configuration for ISR and data caching. */
  cache?: CacheConfig;

  /** Image optimization configuration. */
  imageOptimization?: ImageOptimizationConfig;

  /** Edge middleware configuration. */
  middleware?: MiddlewareConfig;

  /** HTTP redirects. */
  redirects?: Redirect[];

  /** URL rewrites. */
  rewrites?: Rewrite[];

  /** Custom HTTP headers. */
  headers?: HeaderRule[];

  /** Framework metadata (informational). */
  framework: FrameworkInfo;

  /** Build ID for atomic deployments. */
  buildId?: string;
}

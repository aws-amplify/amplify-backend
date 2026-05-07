/**
 * Framework-agnostic deployment manifest.
 *
 * Produced by framework adapters (Next.js/OpenNext, SvelteKit, Astro).
 * Consumed by the L3 AmplifyHostingConstruct.
 *
 * The L3 NEVER knows which framework produced this manifest.
 */

export type DeployManifest = {
  version: 1;

  /** Named compute resources */
  compute: Record<string, ComputeResource>;

  /** Static asset configuration */
  staticAssets: {
    /** Path to static files directory */
    directory: string;
    /** Cache-Control header for assets */
    cacheControl?: string;
  };

  /** Route behaviors (maps URL patterns to compute/static) */
  routes: RouteBehavior[];

  /** Cache infrastructure (provisioned if present) */
  cache?: CacheConfig;

  /** Image optimization (separate Lambda if present) */
  imageOptimization?: ImageConfig;

  /** Middleware (edge function if present) */
  middleware?: MiddlewareConfig;

  /** Redirects */
  redirects?: Redirect[];

  /** Rewrites */
  rewrites?: Rewrite[];

  /** Custom response headers */
  headers?: CustomHeader[];

  /** Build ID for atomic deployments. */
  buildId?: string;
};

export type ComputeResource = {
  /** How this compute runs */
  type: 'handler' | 'http-server' | 'edge';

  /** Path to the bundled code */
  bundle: string;

  /** Handler entry point (for type: 'handler') */
  handler?: string;

  /** Server entry point (for type: 'http-server') */
  entrypoint?: string;

  /** Port for http-server type */
  port?: number;

  /** Where to deploy */
  placement: 'regional' | 'global';

  /** Whether to enable response streaming */
  streaming?: boolean;

  /** Runtime */
  runtime?: string;

  /** Memory (MB) */
  memorySize?: number;

  /** Timeout (seconds) */
  timeout?: number;

  /** Environment variables */
  environment?: Record<string, string>;
};

export type RouteBehavior = {
  /** URL pattern (regex or glob) */
  pattern: string;

  /** Target compute resource name, or 'static' */
  target: string;

  /** Fallback if target fails */
  fallback?: string;
};

export type CacheConfig = {
  /** Which compute resource handles cached content */
  computeResource: string;

  /** Whether tag-based revalidation is needed (provisions DynamoDB) */
  tagRevalidation: boolean;

  /** Whether async revalidation queue is needed (provisions SQS) */
  revalidationQueue: boolean;
};

export type ImageConfig = {
  /** Path to image optimization bundle */
  bundle: string;

  /** Handler entry point */
  handler: string;

  /** Supported formats */
  formats: string[];

  /** Max image sizes */
  sizes: number[];
};

export type MiddlewareConfig = {
  /** Path to middleware bundle */
  bundle: string;

  /** Handler entry point */
  handler: string;

  /** URL patterns this middleware matches */
  matchers: string[];
};

export type Redirect = {
  source: string;
  destination: string;
  statusCode: 301 | 302 | 307 | 308;
};

export type Rewrite = {
  source: string;
  destination: string;
};

export type CustomHeader = {
  source: string;
  headers: Record<string, string>;
};

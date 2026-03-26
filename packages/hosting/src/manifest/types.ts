/**
 * Target type for a route in the deploy manifest.
 */
export type RouteTarget = {
  kind: 'Static' | 'Compute' | 'ImageOptimization';
  /** For Compute routes, the name of the compute resource. */
  src?: string;
  /** Cache-Control header value for static assets. */
  cacheControl?: string;
};

/**
 * A single route in the deploy manifest.
 */
export type ManifestRoute = {
  /** URL pattern (e.g., '/*', '/_next/static/*'). Must start with '/'. */
  path: string;
  /** Target configuration for the route. */
  target: RouteTarget;
};

/**
 * A compute resource (Lambda function) in the deploy manifest.
 */
export type ComputeResource = {
  /** Unique name matching a subdirectory in .amplify-hosting/compute/. */
  name: string;
  /** Lambda runtime (e.g., 'nodejs20.x'). */
  runtime: string;
  /** Entry point file (e.g., 'server.js', 'index.mjs'). */
  entrypoint: string;
};

/**
 * Framework metadata in the deploy manifest.
 */
export type FrameworkMetadata = {
  name: string;
  version?: string;
};

/**
 * The canonical deploy manifest format for .amplify-hosting/deploy-manifest.json.
 */
export type DeployManifest = {
  version: 1;
  routes: ManifestRoute[];
  computeResources?: ComputeResource[];
  framework: FrameworkMetadata;
  /** Build ID for atomic deployments. */
  buildId?: string;
};

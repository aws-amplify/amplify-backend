import { z } from 'zod';
import { BUILD_ID_PATTERN } from '../defaults.js';

/**
 * Zod schema for a ComputeResource.
 */
export const computeResourceSchema = z.object({
  type: z.enum(['handler', 'http-server', 'edge']),
  bundle: z.string().min(1, 'Bundle path must not be empty'),
  handler: z.string().optional(),
  entrypoint: z.string().optional(),
  port: z.number().positive().optional(),
  placement: z.enum(['regional', 'global']),
  streaming: z.boolean().optional(),
  runtime: z.string().optional(),
  memorySize: z.number().positive().optional(),
  timeout: z.number().positive().optional(),
  environment: z.record(z.string()).optional(),
});

/**
 * Zod schema for a RouteBehavior.
 */
export const routeBehaviorSchema = z.object({
  pattern: z.string().min(1, 'Route pattern must not be empty'),
  target: z.string().min(1, 'Route target must not be empty'),
  fallback: z.string().optional(),
});

/**
 * Zod schema for CacheConfig.
 */
export const cacheConfigSchema = z.object({
  computeResource: z.string().min(1),
  tagRevalidation: z.boolean(),
  revalidationQueue: z.boolean(),
});

/**
 * Zod schema for ImageConfig.
 */
export const imageConfigSchema = z.object({
  bundle: z.string().min(1),
  handler: z.string().min(1),
  formats: z.array(z.string()),
  sizes: z.array(z.number().positive()),
});

/**
 * Zod schema for MiddlewareConfig.
 */
export const middlewareConfigSchema = z.object({
  bundle: z.string().min(1),
  handler: z.string().min(1),
  matchers: z.array(z.string()),
});

/**
 * Zod schema for Redirect.
 */
export const redirectSchema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  statusCode: z.union([
    z.literal(301),
    z.literal(302),
    z.literal(307),
    z.literal(308),
  ]),
});

/**
 * Zod schema for Rewrite.
 */
export const rewriteSchema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
});

/**
 * Zod schema for CustomHeader.
 */
export const customHeaderSchema = z.object({
  source: z.string().min(1),
  headers: z.record(z.string()),
});

/** Reserved route targets that don't need a corresponding compute entry. */
const RESERVED_TARGETS = new Set(['static', 's3', 'image-optimization']);

/**
 * Zod schema for the complete DeployManifest.
 */
export const deployManifestSchema = z
  .object({
    version: z.literal(1),
    compute: z.record(computeResourceSchema),
    staticAssets: z.object({
      directory: z.string().min(1, 'Static assets directory must not be empty'),
      cacheControl: z.string().optional(),
    }),
    routes: z
      .array(routeBehaviorSchema)
      .min(1, 'At least one route is required'),
    cache: cacheConfigSchema.optional(),
    imageOptimization: imageConfigSchema.optional(),
    middleware: middlewareConfigSchema.optional(),
    redirects: z.array(redirectSchema).optional(),
    rewrites: z.array(rewriteSchema).optional(),
    headers: z.array(customHeaderSchema).optional(),
    buildId: z
      .string()
      .regex(
        BUILD_ID_PATTERN,
        'buildId must be alphanumeric with hyphens, max 64 chars',
      )
      .optional(),
  })
  .refine(
    (data) => {
      const computeKeys = new Set(Object.keys(data.compute));
      return data.routes.every(
        (route) =>
          RESERVED_TARGETS.has(route.target) || computeKeys.has(route.target),
      );
    },
    {
      message:
        'Route target must reference an existing compute resource or a reserved target (static, s3, default)',
      path: ['routes'],
    },
  );

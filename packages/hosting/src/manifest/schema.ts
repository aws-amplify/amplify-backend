import { z } from 'zod';

/**
 * Zod schema for the RouteTarget.
 */
export const routeTargetSchema = z.object({
  kind: z.enum(['Static', 'Compute', 'ImageOptimization']),
  src: z.string().optional(),
  cacheControl: z.string().optional(),
});

/**
 * Zod schema for a ManifestRoute.
 */
export const manifestRouteSchema = z.object({
  path: z
    .string()
    .min(1, 'Route path must not be empty')
    .startsWith('/', 'Route path must start with /'),
  target: routeTargetSchema,
});

/**
 * Zod schema for a ComputeResource.
 */
export const computeResourceSchema = z.object({
  name: z.string().min(1, 'Compute resource name must not be empty'),
  runtime: z.string().min(1, 'Runtime must not be empty'),
  entrypoint: z.string().min(1, 'Entrypoint must not be empty'),
});

/**
 * Zod schema for FrameworkMetadata.
 */
export const frameworkMetadataSchema = z.object({
  name: z.string().min(1, 'Framework name must not be empty'),
  version: z.string().optional(),
});

/**
 * Zod schema for the complete DeployManifest.
 */
export const deployManifestSchema = z.object({
  version: z.literal(1),
  routes: z
    .array(manifestRouteSchema)
    .min(1, 'At least one route is required in the manifest'),
  computeResources: z.array(computeResourceSchema).optional(),
  framework: frameworkMetadataSchema,
  buildId: z
    .string()
    .regex(
      /^[a-zA-Z0-9-]{1,64}$/,
      'buildId must be alphanumeric with hyphens, max 64 chars',
    )
    .optional(),
});

import { z } from 'zod';

/**
 * This module exports several zod objects and inferred types that define the shape of the IR definition
 * This IR is the output of the `amplify.ts` "builder" and the input to the amplify CDK app transform
 */

// Record<eventName, functionUUID>
export const triggerConfig = z.record(z.string());
export type TriggerConfig = z.infer<typeof triggerConfig>;

export const resourceAccessPolicy = z.object({
  actions: z.array(z.string()).nonempty(),
  scopes: z.array(z.string()).optional(),
});

export type ResourceAccessPolicy = z.infer<typeof resourceAccessPolicy>;

// Record<resourceName, accessConfigList>
export const resourcePolicies = z.record(z.array(resourceAccessPolicy));

// Record<runtimeRoleName, resourcePolicies
export const runtimeAccessConfig = z.record(resourcePolicies);
export type RuntimeAccessConfig = z.infer<typeof runtimeAccessConfig>;

// Record<secretName, SSM reference>
export const secretConfig = z.record(z.string());
export type SecretConfig = z.infer<typeof secretConfig>;

export const buildConfig = z.object({
  command: z.string(),
  relativeWorkingDir: z.string().optional(),
});
export type BuildConfig = z.infer<typeof buildConfig>;

export const constructConfig = z.object({
  adaptor: z.string(),
  properties: z.unknown(),
  triggers: triggerConfig.optional(),
  runtimeAccess: runtimeAccessConfig.optional(),
  secrets: secretConfig.optional(),
  build: buildConfig.optional(),
});
export type ConstructConfig = z.infer<typeof constructConfig>;

export const constructMap = z.record(constructConfig);
export type ConstructMap = z.infer<typeof constructMap>;

export const projectConfig = z.object({
  constructMap: constructMap,
});

export type ProjectConfig = z.infer<typeof projectConfig>;

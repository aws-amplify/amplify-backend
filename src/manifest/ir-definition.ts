import { z } from 'zod';

// Record<eventName, functionUUID>
export const triggerConfig = z.record(z.string());
export type TriggerConfig = z.infer<typeof triggerConfig>;

export const accessConfig = z.object({
  actions: z.array(z.string()).nonempty(),
  scopes: z.array(z.string()).optional(),
});

// Record<resourceName, accessConfigList>
export const resourcePolicies = z.record(z.array(accessConfig));

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

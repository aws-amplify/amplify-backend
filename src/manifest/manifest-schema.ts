import { z } from 'zod';

/**
 * Nomenclature:
 * <*>Name: a human-readable identifier for an object of type <*>
 * <*>Token: A CDK token string that identifies <*>. String operations cannot be relaibly performed on this value
 */

/**
 * Defines a single access policy
 */
const resourceAccessPolicy = z.object({
  actions: z.array(z.string()),
  scopes: z.array(z.string()).optional(),
});
export type ResourceAccessPolicy = z.infer<typeof resourceAccessPolicy>;

/**
 * A list of access policies
 */
const resourceAccessPolicyList = z.array(resourceAccessPolicy);
export type ResourceAccessPolicyList = z.infer<typeof resourceAccessPolicyList>;

/**
 * Alias type for a string that names a resource
 */
const resourceName = z.string();
export type ResourceName = z.infer<typeof resourceName>;

/**
 * Defines the access policies for several resources identified by their resourceName
 */
const runtimeResourceAccess = z.record(resourceName, resourceAccessPolicyList);

/**
 * Alias type for a string that names a runtime IAM Role
 */
const runtimeRoleName = z.string();
export type RuntimeRoleName = z.infer<typeof runtimeRoleName>;

/**
 * Defines the resource access that will be granted to runtime roles
 */
const runtimeAccessConfig = z.record(runtimeRoleName, runtimeResourceAccess);
export type RuntimeAccessConfig = z.infer<typeof runtimeAccessConfig>;

/**
 * Alias type for a string that represents a resource event source
 */
const eventSourceName = z.string();
export type EventSourceName = z.infer<typeof eventSourceName>;

/**
 * Defines lambda event triggers
 */
const functionInvocationConfig = z.record(eventSourceName, resourceName);
export type FunctionInvocationConfig = z.infer<typeof functionInvocationConfig>;

/**
 *
 */
const managedTables = z.array(resourceName);
export type ManagedTables = z.infer<typeof managedTables>;

const resourceDefinition = z.object({
  provider: z.string(),
  definition: z.record(z.unknown()).optional(),
  runtimeAccess: runtimeAccessConfig.optional(),
  triggers: functionInvocationConfig.optional(),
  managedTables: managedTables.optional(),
  preSynthCommand: z.string().optional(),
  secrets: z.record(z.string()).optional(),
});
export type ResourceDefinition = z.infer<typeof resourceDefinition>;

const resourceRecord = z.record(resourceDefinition);
export type ResourceRecord = z.infer<typeof resourceRecord>;

const providerName = z.string();
export type ProviderName = z.infer<typeof providerName>;

const providerRecord = z.record(providerName, z.string());
export type ProviderRecord = z.infer<typeof providerRecord>;

const secretsList = z.array(z.string());
export type SecretsList = z.infer<typeof secretsList>;

const parametersList = z.array(z.string());
export type ParametersList = z.infer<typeof parametersList>;

export const amplifyManifest = z.object({
  version: z.string(),
  resources: resourceRecord,
  providers: providerRecord,
  secrets: secretsList,
  parameters: parametersList,
});

export type AmplifyManifest = z.infer<typeof amplifyManifest>;

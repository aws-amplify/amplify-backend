import { z } from 'zod';

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
 * Alias type for a string that contains a token for another resource
 */
const resourceToken = z.string();
export type ResourceToken = z.infer<typeof resourceToken>;

/**
 * Defines the access policies for several resources identified by their token
 */
const runtimeResourceAccess = z.record(resourceToken, resourceAccessPolicyList);

/**
 * Alias type for a string that contains a token representing a runtime IAM Role
 */
const runtimeRoleToken = z.string();
export type RuntimeRoleToken = z.infer<typeof runtimeRoleToken>;

/**
 * Defines the resource access that will be granted to runtime roles
 */
const runtimeAccessConfig = z.record(runtimeRoleToken, runtimeResourceAccess);
export type RuntimeAccessConfig = z.infer<typeof runtimeAccessConfig>;

/**
 * Alias type for a string that represents a resource event source
 */
const eventSourceToken = z.string();
export type eventSourceToken = z.infer<typeof eventSourceToken>;

/**
 * Defines lambda event triggers
 */
const functionInvocationConfig = z.record(eventSourceToken, resourceToken);
export type FunctionInvocationConfig = z.infer<typeof functionInvocationConfig>;

/**
 *
 */
const managedTables = z.array(resourceToken);
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

const providerToken = z.string();
export type ProviderToken = z.infer<typeof providerToken>;

const providerRecord = z.record(providerToken, z.string());
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

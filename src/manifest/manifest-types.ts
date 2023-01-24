/**
 * The base manifest type
 *
 * The contents of this object fully define an Amplify project
 */
export type AmplifyManifest = {
  /**
   * Defines a semver range of the Amplify shared interface package (something like @aws-amplify/transformer-interface@~4.7.2)
   * This is used by the platform when loading the manifest to know if it is a compatible version
   */
  version: string;
  /**
   * Defines the backend resources in the project
   */
  resources: ResourceRecord;

  /**
   * Defines the transformers required to parse the resource definition
   */
  providers: ProviderRecord;

  /**
   * Defines secret references that are used to parameterize resource config
   */
  secrets?: string[];

  /**
   * Defines non-secret references that are used to parameterize resource config
   */
  parameters?: string[];
};

/**
 * Key / Value record of all resources in the project
 */
export type ResourceRecord = Record<ResourceName, ResourceDefinition>;

/**
 * Key / Value record of all transformers required by the project
 */
export type ProviderRecord = Record<ProviderKey, ProviderInstanceToken>;

export type ResourceName = string;
export type ProviderKey = string;
export type ProviderInstanceToken = string;

/**
 * Definition for all Amplify resources
 */
export type ResourceDefinition = {
  /**
   * The transformer that knows how to parse / synthesize this resource
   */
  provider: ProviderKey;
  /**
   * Configuration that is unique to this resource type. It is a passthrough object to the platform. Only the transformer knows how to process this information
   */
  definition: Record<string, unknown>;
  /**
   * Defines other resources that this resource can access at application runtime
   */
  runtimeAccess?: RuntimeAccessConfig;
  /**
   * Defines lambda functions that this resource can trigger on certain events
   */
  triggers?: FunctionInvocationConfig;
  /**
   * Specifies tables in the projct on which this resource is managing the indexes
   */
  managedTables?: ManagedTables;
  /**
   * Defines a command that should be run before synthesizing the resource
   */
  preSynthCommand?: string;
  /**
   * Defines the secrets (if any) that this resource needs access to
   */
  secrets?: Record<string, string>;
};

/**
 * Defines resource access for specified runtime roles. These role names are known to the resource on which the config is attached
 */
export type RuntimeAccessConfig = Record<RuntimeRoleToken, RuntimeResourceAccess>;

/**
 * Alias for a string that references a role that is known to a resource
 */
export type RuntimeRoleToken = string;

/**
 * The name of a resource in the manifest.
 * Can also be the special token $external to support referencing external resources in resource permissions
 */
export type ResourceToken = string;

/**
 * Defines a runtime access document. More or less 1:1 with an IAM Policy Document
 */
type RuntimeResourceAccess = Record<ResourceToken, ResourceAccessConfig[]>;

/**
 * Defines actions and optionally scoped down permissions for a specific resource
 */
export type ResourceAccessConfig = {
  actions: string[];
  scopes?: string[];
};

/**
 * Defines a mapping between event sources that are known to the resource on which the config is attached and lambda resource names that should be invoked in response to those events
 */
type FunctionInvocationConfig = Record<EventSource, ResourceName>;

/**
 * Alias for a string that represents a runtime event
 */
type EventSource = string;

/**
 * List of resource names that are tables whose indexes are being managed by another resource in the project
 */
type ManagedTables = ResourceName[];

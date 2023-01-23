import { SecretKey } from 'aws-sdk/clients/appflow';
import { ParameterKey } from 'aws-sdk/clients/cloudformation';

export type TokenizedManifest = {
  resources: Record<string, unknown>;
  transformers: Record<string, string>;
  secrets?: Record<string, string>;
  parameters?: Record<string, string>;
};

export type HydratedManifest = TokenizedManifest;

/**
 * The base manifest type
 *
 * The contents of this object fully define an Amplify project
 */
export type AmplifyManifest = {
  /**
   * Defines the backend resources in the project
   */
  resources: ResourceRecord;

  /**
   * Defines the transformers required to parse the resource definition
   */
  transformers: TransformerRecord;

  /**
   * Defines secret references that are used to parameterize resource config
   */
  secrets?: SecretReferenceRecord;

  /**
   * Defines non-secret references that are used to parameterize resource config
   */
  parameters?: ParameterReferenceRecord;
};

/**
 * Key / Value record of all resources in the project
 */
export type ResourceRecord = Record<ResourceName, ResourceDefinition>;

/**
 * Key / Value record of all transformers required by the project
 */
export type TransformerRecord = Record<ProviderKey, TransformName>;

/**
 * Key / Value record of all secrets referenced by the project resources
 */
export type SecretReferenceRecord = Record<SecretKey, SecretReference>;

/**
 * Key / Value record of all non-secret parameters referenced by the project resources
 */
export type ParameterReferenceRecord = Record<ParameterKey, ParameterReference>;

export type SecretLookup = string;
export type ParameterLookup = string;

/**
 * Union type of all supported secret references.
 */
export type SecretReference = SSMSecureStringName;
export type ParameterReference = SSMStringName | EnvironmentVariableName | string;

export type SSMSecureStringName = string;
export type SSMStringName = string;
export type EnvironmentVariableName = string;

export const ExternalToken = '$external';

export type ResourceName = string;
export type ProviderKey = string;
export type TransformName = string;

type ResourceToken = typeof ExternalToken | ResourceName;

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
   * Defines keys within the definition object that are being controlled by other resources and thus cannot be specified in the definition block
   */
  internallyManagedProperties?: string[];
  /**
   * Specifies tables in the projct on which this resource is managing the indexes
   */
  managedTables?: ManagedTables;
};

/**
 * Defines resource access for specified runtime roles. These role names are known to the resource on which the config is attached
 */
export type RuntimeAccessConfig = Record<RuntimeExecutionRole, RuntimeResourceAccess>;

/**
 * Alias for a string that references a role that is known to a resource
 */
type RuntimeExecutionRole = string;

/**
 * Defines a runtime access document. More or less 1:1 with an IAM Policy Document
 */
type RuntimeResourceAccess = Record<ResourceToken, ResourceAccessConfig[]>;

/**
 * Defines actions and optionally scoped down permissions for a specific resource
 */
type ResourceAccessConfig = {
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

// const test: AmplifyManifest = {
//   resources: new Map(
//     Object.entries({
//       myStorage: {
//         transformer: "AmplifyFileStorage",
//         definition: {
//           bucketKeyEnabled: true,
//           versioningEnabled: true,
//         },
//         internallyManagedProperties: ["bucketKeyEnabled"],
//         triggers: new Map(
//           Object.entries({
//             onUpload: "myFunction",
//             onDownload: "anotherFunction",
//           })
//         ),
//       },
//       myAuth: {
//         transformer: "AmplifyUserPool",
//         definition: {
//           userGroups: ["group1", "group2"],
//           passwordPolicy: {
//             requireUppercase: true,
//             requireLowercase: true,
//             minLength: 10,
//           },
//           requiredSignUpAttributes: ["email", "firstName"],
//         },
//         runtimeAccess: new Map(
//           Object.entries({
//             authenticatedUsers: new Map(
//               Object.entries({
//                 myFunction: [{ actions: ["invoke"] }],
//                 myStorage: [
//                   { actions: ["read"] }, // grants read permission on everything in the bucket
//                   {
//                     actions: ["create", "update", "delete"],
//                     scopes: ["/something", "/private/*"],
//                   }, // grants CUD permissions on specific paths in the bucket
//                 ],
//                 $external: [
//                   {
//                     actions: ["APICall1", "APICall2"],
//                     scopes: ["ARN1", "ARN2"],
//                   },
//                 ],
//               })
//             ),
//             unauthenticatedUsers: new Map(
//               Object.entries({
//                 myStorage: [{ actions: ["read"] }],
//               })
//             ),
//             group1: new Map(
//               Object.entries({
//                 $external: [{ actions: ["AdminApi"], scopes: ["adminResource"] }],
//               })
//             ),
//           })
//         ),
//       },
//     })
//   ),
//   transformers: new Map(
//     Object.entries({
//       AmplifyUserPool: "AmplifyUserPoolTransformPackageName",
//       AmplifyFileStorage: "@aws-amplify/storage-transform@1.2.3",
//     })
//   ),
// };

export type AmplifyManifest = {
  resources: ResourceDefinitionRecord;
  transformers: AmplifyTransformerDefinitions;
};

export type ResourceDefinitionRecord = Record<ResourceName, ResourceDefinition>;

type AmplifyTransformerDefinitions = Record<TransformKey, TransformName>;

export const ExternalToken = "$external";

export type ResourceName = string;
export type TransformKey = string;
type TransformName = string;

type ResourceToken = typeof ExternalToken | ResourceName;

type ResourceDefinition = {
  transformer: string;
  definition: unknown; // only parseable by the handler
  runtimeAccess?: RuntimeAccessConfig;
  triggers?: FunctionInvocationConfig;
  internallyManagedProperties?: string[];
};

type RuntimeAccessConfig = Record<RuntimeExecutionRole, RuntimeResourceAccess>;

type RuntimeExecutionRole = string;

type RuntimeResourceAccess = Record<ResourceToken, ResourceAccessConfig[]>;

type ResourceAccessConfig = {
  actions: string[];
  scopes?: string[];
};

type FunctionInvocationConfig = Record<EventSource, ResourceName>;

type EventSource = string;

export type AssetReference = LocalFileReference;

type LocalFileReference = {
  type: "LocalFileReference";
  relativePath: string;
};

const test: AmplifyManifest = {
  resources: {
    myStorage: {
      transformer: "AmplifyFileStorage",
      definition: {
        bucketKeyEnabled: true,
        versioningEnabled: true,
      },
      internallyManagedProperties: ["bucketKeyEnabled"],
      triggers: {
        onUpload: "myFunction",
        onDownload: "anotherFunction",
      },
    },
    myAuth: {
      transformer: "AmplifyUserPool",
      definition: {
        userGroups: ["group1", "group2"],
        passwordPolicy: {
          requireUppercase: true,
          requireLowercase: true,
          minLength: 10,
        },
        requiredSignUpAttributes: ["email", "firstName"],
      },
      runtimeAccess: {
        authenticatedUsers: {
          myFunction: [{ actions: ["invoke"] }],
          myStorage: [
            { actions: ["read"] }, // grants read permission on everything in the bucket
            {
              actions: ["create", "update", "delete"],
              scopes: ["/something", "/private/*"],
            }, // grants CUD permissions on specific paths in the bucket
          ],
          $external: [
            {
              actions: ["APICall1", "APICall2"],
              scopes: ["resource1", "resource2"],
            },
          ],
        },
        unauthenticatedUsers: {
          myStorage: [{ actions: ["read"] }],
        },
        group1: {
          $external: [{ actions: ["AdminApi"], scopes: ["adminResource"] }],
        },
      },
      triggers: {},
    },
  },
  transformers: {
    AmplifyUserPool: "AmplifyUserPoolTransformPackageName",
    AmplifyFileStorage: "@aws-amplify/storage-transform@1.2.3",
  },
};

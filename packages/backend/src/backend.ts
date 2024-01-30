import { ConstructFactory, ResourceProvider } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import {
  AuthClientConfig,
  ClientConfig,
  ClientConfigFormat,
  CustomClientConfig,
  GraphqlClientConfig
} from "@aws-amplify/client-config";

export type BackendBase = {
  createStack: (name: string) => Stack;
  setCustomOutput: (key: string, value: string, options?: CustomOutputOptions) => void;
  setOutput: (clientConfigPart: Partial<ClientConfig>) => void;

  addOutput1: (clientConfigPart: Partial<ClientConfig>) => void;
  addOutput2: (clientConfigPart: AuthClientConfig | GraphqlClientConfig | CustomClientConfig) => void;
  addOutput3: (path: string, value: string) => void;
  addOutput4: (outputId: string, value: string, options?: OutputOptions) => void;
};

export type ClientConfigDestination = {
  // TODO
  // should the type be ClientConfigFormat from client config (lift to platform types?)
  // or should we just cover JS format here and rely on JS -> Mobile/others transformation in client config package ?
  // the generateClientConfig returns ClientConfig type which is JS.
  // the generateClientConfigToFile maps JS ClientConfig into other formats
  // Problems:
  // - if we just cover JS format here then mobile developers would need to understand JS format
  //   and we'd have to cover mappings for mobile platforms for all known 1st party keys
  // - if we give flexibility to define path per platform then what do we do with  ClientConfig and generateClientConfig?
  //   on the other hand we won't have to provide ClientConfig -> platform mappings for 1st party components like geo.
  // Best if we unified client config first...
  // But then... when we unify client config then clientConfigFormat doesn't make any sense and we'd have to deprecate it.
  //
  // For the purpose of prototype I'm going to ignore clientConfigFormat and assume it just covers JS schema and we map.
  clientConfigFormat: string;
  path: Array<string>;
}

export type CustomOutputOptions = {
  clientConfigDestinations?: Array<ClientConfigDestination>
}

export type ClientConfigDestination2 = {
  clientConfigFormat: ClientConfigFormat;
  path: string;
}

export type OutputOptions = {
  clientConfigDestinations?: Array<ClientConfigDestination2>
}

// Type that allows construct factories to be defined using any keys except those used in BackendHelpers
export type DefineBackendProps = Record<
  string,
  ConstructFactory<ResourceProvider>
> & { [K in keyof BackendBase]?: never };

/**
 * Use `defineBackend` to create an instance of this type.
 * This object has the Amplify BackendBase methods on it for interacting with the backend.
 * It also has dynamic properties based on the resources passed into `defineBackend`
 */
export type Backend<T extends DefineBackendProps> = BackendBase & {
  [K in keyof T]: ReturnType<T[K]['getInstance']>;
};

import {
  ConstructFactory,
  DeepPartialAmplifyGeneratedConfigs,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import { ClientConfig } from '@aws-amplify/client-config';

export type BackendBase = {
  createStack: (name: string) => Stack;
  addOutput: (
    clientConfigPart: DeepPartialAmplifyGeneratedConfigs<ClientConfig>
  ) => void;
};

// Type that allows construct factories to be defined using any keys except those used in BackendHelpers
export type DefineBackendProps = Record<
  string,
  ConstructFactory<
    ResourceProvider & Partial<ResourceAccessAcceptorFactory<never>>
  >
> & { [K in keyof BackendBase]?: never };

/**
 * Use `defineBackend` to create an instance of this type.
 * This object has the Amplify BackendBase methods on it for interacting with the backend.
 * It also has dynamic properties based on the resources passed into `defineBackend`
 */
export type Backend<T extends DefineBackendProps> = BackendBase & {
  [K in keyof T]: Omit<
    ReturnType<T[K]['getInstance']>,
    keyof ResourceAccessAcceptorFactory
  >;
};

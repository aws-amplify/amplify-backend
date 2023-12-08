import { ConstructFactory, ResourceProvider } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';

export type BackendHelpers = {
  createStack: (name: string) => Stack;
};

// Type that allows construct factories to be defined using any keys except those used in BackendHelpers
export type BackendInput = Record<
  string,
  ConstructFactory<ResourceProvider>
> & { [K in keyof BackendHelpers]?: never };

/**
 * Top level type for instance returned from `defineBackend`. Contains property `resources` for overriding
 * Amplify generated resources and `getStack()` for adding custom resources.
 */
export type Backend<
  T extends Record<string, ConstructFactory<ResourceProvider>>
> = BackendHelpers & {
  [K in keyof T]: ReturnType<T[K]['getInstance']>['resources'];
};

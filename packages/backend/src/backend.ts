import { ConstructFactory } from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';

/**
 * Top level type for instance returned from `defineBackend`. Contains property `resources` for overriding
 * Amplify generated resources and `getStack()` for adding custom resources.
 */
export type Backend<T extends Record<string, ConstructFactory<Construct>>> = {
  getStack: (name: string) => Stack;
  readonly resources: {
    [K in keyof T]: ReturnType<T[K]['getInstance']>;
  };
};

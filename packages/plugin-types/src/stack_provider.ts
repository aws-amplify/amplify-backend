import { Stack } from 'aws-cdk-lib';

export type StackProvider = {
  readonly stack: Stack;
};

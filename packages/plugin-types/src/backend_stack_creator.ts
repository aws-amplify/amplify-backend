import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';

/**
 * Interface for objects that can create stacks in a given scope
 */
export type BackendStackCreator = {
  createStack(scope: Construct): Stack;
};

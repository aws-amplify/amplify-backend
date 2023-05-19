import { Construct } from 'constructs';

/**
 * Initializes a CDK Construct in a given scope
 */
export type ConstructInitializer<Instance extends Construct> = {
  /**
   * A group name for this ConstructInitializer.
   * This can be used by a consumer to make a determination about what stack to place the Construct in.
   */
  resourceGroupName: string;

  /**
   * Create a new instance of a CDK construct in the provided scope.
   */
  initialize(scope: Construct): Instance;
};

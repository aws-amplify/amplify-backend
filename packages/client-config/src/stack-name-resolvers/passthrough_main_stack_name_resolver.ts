import { MainStackNameResolver } from '@aws-amplify/plugin-types';

export type StackIdentifier = {
  stackName: string;
};

/**
 * A pass-through implementation of MainStackNameResolver for when the stack name of a backend is already known
 */
export class PassThroughMainStackNameResolver implements MainStackNameResolver {
  /**
   * Initialize with the known stack name
   */
  constructor(private readonly stackNameIdentifier: StackIdentifier) {}

  /**
   * Return the stack name
   */
  async resolveMainStackName(): Promise<string> {
    return this.stackNameIdentifier.stackName;
  }
}

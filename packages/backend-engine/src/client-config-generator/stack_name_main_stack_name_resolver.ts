import { MainStackNameResolver } from '@aws-amplify/plugin-types';

/**
 * A pass-through implementation of MainStackNameResolver for when the stack name of a backend is already known
 */
export class StackNameMainStackNameResolver implements MainStackNameResolver {
  /**
   * Initialize with the known stack name
   */
  constructor(private readonly stackName: string) {}

  /**
   * Return the stack name
   */
  async resolveMainStackName(): Promise<string> {
    return this.stackName;
  }
}

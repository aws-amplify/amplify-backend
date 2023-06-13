import { BackendStackResolver } from '@aws-amplify/backend-types';

/**
 * Essentially a no-op implementation of BackendStackResolver for when the stack name of a backend is already known
 */
export class StackNameBackendIdentificationStrategy
  implements BackendStackResolver
{
  /**
   * Initialize with the known stack name
   */
  constructor(private readonly stackName: string) {}

  /**
   * Return the stack name
   */
  async resolveStackName(): Promise<string> {
    return this.stackName;
  }
}

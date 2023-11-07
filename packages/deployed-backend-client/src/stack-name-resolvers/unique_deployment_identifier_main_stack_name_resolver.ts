import {
  MainStackNameResolver,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';

/**
 * Resolves the main stack name for a given project environment
 */
export class UniqueBackendIdentifierMainStackNameResolver
  implements MainStackNameResolver
{
  /**
   * Initialize with the project environment identifier and an SSMClient
   */
  constructor(
    private readonly uniqueBackendIdentifier: UniqueBackendIdentifier
  ) {}

  /**
   * Resolve the stack name for this project environment
   */
  resolveMainStackName = async (): Promise<string> => {
    return this.uniqueBackendIdentifier.toStackName();
  };
}

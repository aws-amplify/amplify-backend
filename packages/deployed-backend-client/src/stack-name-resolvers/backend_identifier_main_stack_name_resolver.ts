import {
  BackendIdentifier,
  MainStackNameResolver,
} from '@aws-amplify/plugin-types';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';

/**
 * Resolves the main stack name for a given project environment
 */
export class BackendIdentifierMainStackNameResolver
  implements MainStackNameResolver
{
  /**
   * Initialize with the project environment identifier and an SSMClient
   */
  constructor(private readonly backendId: BackendIdentifier) {}

  /**
   * Resolve the stack name for this project environment
   */
  resolveMainStackName = async (): Promise<string> =>
    BackendIdentifierConversions.toStackName(this.backendId);
}

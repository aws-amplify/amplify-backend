import {
  BackendIdentifierParts,
  MainStackNameResolver,
} from '@aws-amplify/plugin-types';
import { backendIdentifierPartsToStackName } from '@aws-amplify/platform-core';

/**
 * Resolves the main stack name for a given project environment
 */
export class BackendIdentifierPartsMainStackNameResolver
  implements MainStackNameResolver
{
  /**
   * Initialize with the project environment identifier and an SSMClient
   */
  constructor(
    private readonly backendIdentifierParts: BackendIdentifierParts
  ) {}

  /**
   * Resolve the stack name for this project environment
   */
  resolveMainStackName = async (): Promise<string> =>
    backendIdentifierPartsToStackName(this.backendIdentifierParts);
}

import { MainStackNameResolver } from '@aws-amplify/plugin-types';
import { getMainStackName as getMainStackNameOriginal } from '../get_main_stack_name.js';
import { UniqueBackendIdentifier } from '@aws-amplify/platform-core';

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
    private readonly uniqueDeploymentIdentifier: UniqueBackendIdentifier,
    private readonly getMainStackName = getMainStackNameOriginal
  ) {}

  /**
   * Resolve the stack name for this project environment
   */
  resolveMainStackName = async (): Promise<string> => {
    return this.getMainStackName(this.uniqueDeploymentIdentifier);
  };
}

import {
  MainStackNameResolver,
  UniqueDeploymentIdentifier,
} from '@aws-amplify/plugin-types';
import { getMainStackName as getMainStackNameOriginal } from '../get_main_stack_name.js';

/**
 * Resolves the main stack name for a given project environment
 */
export class UniqueDeploymentIdentifierMainStackNameResolver
  implements MainStackNameResolver
{
  /**
   * Initialize with the project environment identifier and an SSMClient
   */
  constructor(
    private readonly uniqueDeploymentIdentifier: UniqueDeploymentIdentifier,
    private readonly getMainStackName = getMainStackNameOriginal
  ) {}

  /**
   * Resolve the stack name for this project environment
   */
  async resolveMainStackName(): Promise<string> {
    return this.getMainStackName(this.uniqueDeploymentIdentifier);
  }
}

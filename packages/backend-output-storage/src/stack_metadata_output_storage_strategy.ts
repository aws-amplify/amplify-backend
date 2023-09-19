import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';

/**
 * Implementation of BackendOutputStorageStrategy that stores config data in stack metadata and outputs
 */
export class StackMetadataBackendOutputStorageStrategy
  implements BackendOutputStorageStrategy<BackendOutputEntry>
{
  /**
   * Initialize the instance with a stack.
   *
   * If the stack is an AmplifyStack, set a parameter in SSM so the stack can be identified later by the project environment
   */
  constructor(private readonly stack: Stack) {}

  /**
   * Store construct output as stack output and add pending metadata to the metadata object.
   *
   * Metadata is not written to the stack until flush() is called
   */
  addBackendOutputEntry = (
    keyName: string,
    backendOutputEntry: BackendOutputEntry
  ): void => {
    // add all the data values as stack outputs
    Object.entries(backendOutputEntry.payload).forEach(([key, value]) => {
      new CfnOutput(this.stack, key, { value });
    });

    // TODO
    // temporary hack to work around the fact that the gql construct has hard-coded a duplicate of this key in their codebase
    // once this hard-coding is removed and they are depending on the shared packages, this can be removed
    const mappedKeyName =
      keyName === 'graphqlOutput' ? graphqlOutputKey : keyName;

    this.stack.addMetadata(mappedKeyName, {
      version: backendOutputEntry.version,
      stackOutputs: Object.keys(backendOutputEntry.payload),
    });
  };

  /**
   * Persists the metadata object to the stack metadata
   */
  flush = (): void => {
    // NOOP until the duplicate BackendOutputStorageStrategy type in the gql construct can be removed
  };
}

import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { ClientConfig } from '@aws-amplify/client-config';
import {
  CustomOutput,
  customOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { Lazy } from 'aws-cdk-lib';
import {
  AmplifyUserError,
  ObjectAccumulator,
  ObjectAccumulatorPropertyAlreadyExistsError,
} from '@aws-amplify/platform-core';

/**
 * Accumulates custom outputs as they're added to the backend.
 */
export class CustomOutputsAccumulator {
  private hasBackendOutputEntry = false;

  /**
   * Creates custom outputs accumulator.
   */
  constructor(
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<CustomOutput>,
    private readonly clientConfigAccumulator: ObjectAccumulator<ClientConfig>
  ) {}

  addOutput = (clientConfigPart: Partial<ClientConfig>) => {
    try {
      this.clientConfigAccumulator.accumulate(clientConfigPart);
    } catch (error) {
      if (error instanceof ObjectAccumulatorPropertyAlreadyExistsError) {
        throw new AmplifyUserError(
          'OutputEntryAlreadyExists',
          {
            message: `Output entry with key ${error.key} already exists`,
            resolution:
              "Check if 'backend.addOutput' is called multiple times with overlapping inputs",
          },
          error
        );
      }
      throw error;
    }
    this.ensureBackendOutputEntry();
  };

  private ensureBackendOutputEntry = () => {
    if (this.hasBackendOutputEntry) {
      return;
    }
    this.outputStorageStrategy.addBackendOutputEntry(customOutputKey, {
      version: '1',
      payload: {
        customOutputs: Lazy.string({
          produce: () => {
            return JSON.stringify(
              this.clientConfigAccumulator.getAccumulatedObject()
            );
          },
        }),
      },
    });
    this.hasBackendOutputEntry = true;
  };
}

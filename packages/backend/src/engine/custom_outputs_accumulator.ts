import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { ClientConfig } from '@aws-amplify/client-config';
import {
  CustomOutput,
  customOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { Lazy } from 'aws-cdk-lib';
import { ObjectAccumulator } from '@aws-amplify/platform-core';

/**
 * Accumulates custom outputs as they're added to the backend.
 */
export class CustomOutputsAccumulator {
  private readonly clientConfigAccumulator: ObjectAccumulator<ClientConfig> =
    new ObjectAccumulator<ClientConfig>({});
  private hasBackendOutputEntry = false;

  /**
   * Creates custom outputs accumulator.
   */
  constructor(
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<CustomOutput>
  ) {}

  addOutput = (clientConfigPart: Partial<ClientConfig>) => {
    this.clientConfigAccumulator.accumulate(clientConfigPart);
    this.ensureBackendOutputEntry();
  };

  private ensureBackendOutputEntry = () => {
    if (!this.hasBackendOutputEntry) {
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

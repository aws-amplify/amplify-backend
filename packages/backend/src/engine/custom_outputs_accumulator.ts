import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { ClientConfig } from '@aws-amplify/client-config';
import {
  CustomOutput,
  customOutputKey,
} from '@aws-amplify/backend-output-schemas';
import _ from 'lodash';
import { Lazy } from 'aws-cdk-lib';

/**
 * Accumulates custom outputs as they're added to the backend.
 */
export class CustomOutputsAccumulator {
  private readonly accumulatedClientConfig: Partial<ClientConfig> = {};
  private hasBackendOutputEntry = false;

  /**
   * Creates custom outputs accumulator.
   */
  constructor(
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<CustomOutput>
  ) {}

  private ensureBackendOutputEntry() {
    if (!this.hasBackendOutputEntry) {
      this.outputStorageStrategy.addBackendOutputEntry(customOutputKey, {
        version: '1',
        payload: {
          customOutputs: Lazy.string({
            produce: () => {
              return JSON.stringify(this.accumulatedClientConfig);
            },
          }),
        },
      });
      this.hasBackendOutputEntry = true;
    }
  }

  addOutput = (clientConfigPart: Partial<ClientConfig>) => {
    _.mergeWith(this.accumulatedClientConfig, clientConfigPart, () => {
      return undefined;
    });
    this.ensureBackendOutputEntry();
  };
}

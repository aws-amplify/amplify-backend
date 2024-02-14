import {
  FunctionOutput,
  functionOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { ObjectAccumulator } from '@aws-amplify/platform-core';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { Lazy } from 'aws-cdk-lib';

export type FunctionConfig = {
  customerFunctions: string[];
};

/**
 * Accumulates function outputs as they're added to the backend
 */
export class FunctionOutputsAccumulator {
  /**
   * Creates function outputs accumulator.
   */
  constructor(
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>,
    private readonly functionAccumulator: ObjectAccumulator<FunctionConfig>
  ) {
    this.outputStorageStrategy.addBackendOutputEntry(functionOutputKey, {
      version: '1',
      payload: {
        customerFunctions: Lazy.string({
          produce: () => {
            return JSON.stringify(
              this.functionAccumulator.getAccumulatedObject().customerFunctions
            );
          },
        }),
      },
    });
  }

  addOutput = (functionPart: Partial<FunctionConfig>) => {
    this.functionAccumulator.accumulate(functionPart);
  };
}

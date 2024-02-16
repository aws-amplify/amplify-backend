import { ObjectAccumulator } from '@aws-amplify/platform-core';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import { beforeEach, describe, it, mock } from 'node:test';
import {
  FunctionConfig,
  FunctionOutputsAccumulator,
} from './function_outputs_accumulator.js';
import assert from 'node:assert';
import { Stack } from 'aws-cdk-lib';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import { Template } from 'aws-cdk-lib/assertions';

void describe('FunctionOutputsAccumulator', () => {
  const storeOutputMock = mock.fn();
  const stubBackendOutputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry> =
    {
      addBackendOutputEntry: storeOutputMock,
      appendToBackendOutputList: storeOutputMock,
    };
  const objectAccumulator = new ObjectAccumulator<FunctionConfig>({});
  const accumulateMock = mock.method(objectAccumulator, 'accumulate', () => {
    // no-op to make sure real implementation is not called.
  });

  beforeEach(() => {
    storeOutputMock.mock.resetCalls();
    accumulateMock.mock.resetCalls();
  });

  void it('accumulates function entries and creates single merged output', () => {
    const accumulator = new FunctionOutputsAccumulator(
      stubBackendOutputStorageStrategy,
      objectAccumulator
    );

    const configPart1 = { customerFunctions: ['val1'] };
    const configPart2 = { customerFunctions: ['val2'] };
    accumulator.addOutput(configPart1);
    accumulator.addOutput(configPart2);

    assert.strictEqual(accumulateMock.mock.calls.length, 2);
    assert.strictEqual(accumulateMock.mock.calls[0].arguments[0], configPart1);
    assert.strictEqual(accumulateMock.mock.calls[1].arguments[0], configPart2);

    assert.strictEqual(storeOutputMock.mock.calls.length, 1);
  });

  void it('serializes accumulated config', () => {
    // This test needs real dependencies to test behavior of cdk.Lazy
    const stack = new Stack();
    const accumulator = new FunctionOutputsAccumulator(
      new StackMetadataBackendOutputStorageStrategy(stack),
      new ObjectAccumulator<FunctionConfig>({})
    );

    accumulator.addOutput({ customerFunctions: ['val1'] });
    accumulator.addOutput({ customerFunctions: ['val2'] });

    const expectedAccumulatedOutput = ['val1', 'val2'];

    const template = Template.fromStack(stack);

    const customOutputValue =
      template.findOutputs('customerFunctions').customerFunctions.Value;
    assert.deepEqual(JSON.parse(customOutputValue), expectedAccumulatedOutput);
  });
});

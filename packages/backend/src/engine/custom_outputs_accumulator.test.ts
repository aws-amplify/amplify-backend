import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  DeepPartialAmplifyGeneratedConfigs,
} from '@aws-amplify/plugin-types';
import { CustomOutputsAccumulator } from './custom_outputs_accumulator.js';
import {
  AmplifyUserError,
  ObjectAccumulator,
  ObjectAccumulatorPropertyAlreadyExistsError,
  ObjectAccumulatorVersionMismatchError,
} from '@aws-amplify/platform-core';
import { ClientConfig } from '@aws-amplify/client-config';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

void describe('Custom outputs accumulator', () => {
  const storeOutputMock = mock.fn();
  const stubBackendOutputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry> =
    {
      addBackendOutputEntry: storeOutputMock,
      appendToBackendOutputList: storeOutputMock,
    };
  const objectAccumulator = new ObjectAccumulator<ClientConfig>({});
  const accumulateMock = mock.method(objectAccumulator, 'accumulate', () => {
    // no-op to make sure real implementation is not called.
  });

  beforeEach(() => {
    storeOutputMock.mock.resetCalls();
    accumulateMock.mock.resetCalls();
  });

  void it('accumulates client config entries and creates single merged output', () => {
    const accumulator = new CustomOutputsAccumulator(
      stubBackendOutputStorageStrategy,
      objectAccumulator
    );

    const configPart1 = { custom: { output1: 'val1' } };
    const configPart2 = { custom: { output2: 'val2' } };
    accumulator.addOutput(configPart1);
    accumulator.addOutput(configPart2);

    assert.strictEqual(accumulateMock.mock.calls.length, 2);
    assert.strictEqual(accumulateMock.mock.calls[0].arguments[0], configPart1);
    assert.strictEqual(accumulateMock.mock.calls[1].arguments[0], configPart2);

    assert.strictEqual(storeOutputMock.mock.calls.length, 1);
  });

  void it('accumulates client config entries for same version and creates single merged output', () => {
    const accumulator = new CustomOutputsAccumulator(
      stubBackendOutputStorageStrategy,
      objectAccumulator
    );

    const configPart1: DeepPartialAmplifyGeneratedConfigs<ClientConfig> = {
      version: '1',
      custom: { output1: 'val1' },
    };
    const configPart2: DeepPartialAmplifyGeneratedConfigs<ClientConfig> = {
      version: '1',
      custom: { output2: 'val2' },
    };
    accumulator.addOutput(configPart1);
    accumulator.addOutput(configPart2);

    assert.strictEqual(accumulateMock.mock.calls.length, 2);
    assert.strictEqual(accumulateMock.mock.calls[0].arguments[0], configPart1);
    assert.strictEqual(accumulateMock.mock.calls[1].arguments[0], configPart2);

    assert.strictEqual(storeOutputMock.mock.calls.length, 1);
  });

  void it('wraps property already exist error', () => {
    const accumulator = new CustomOutputsAccumulator(
      stubBackendOutputStorageStrategy,
      objectAccumulator
    );

    accumulateMock.mock.mockImplementationOnce(() => {
      throw new ObjectAccumulatorPropertyAlreadyExistsError(
        'output1',
        'val0',
        'val1'
      );
    });

    assert.throws(
      () => accumulator.addOutput({ custom: { output1: 'val1' } }),
      (error: AmplifyUserError) => {
        assert.strictEqual(
          error.message,
          'Output entry with key output1 already exists'
        );
        assert.ok(error.resolution);
        return true;
      }
    );
  });

  void it('wraps version mismatch error', () => {
    const accumulator = new CustomOutputsAccumulator(
      stubBackendOutputStorageStrategy,
      objectAccumulator
    );

    accumulateMock.mock.mockImplementationOnce(() => {
      throw new ObjectAccumulatorVersionMismatchError('val0', 'val1');
    });

    assert.throws(
      () =>
        accumulator.addOutput({ version: '1', custom: { output1: 'val1' } }),
      (error: AmplifyUserError) => {
        assert.strictEqual(
          error.message,
          'Conflicting versions of client configuration found.'
        );
        assert.ok(error.resolution);
        return true;
      }
    );
  });

  void it('does not wrap unexpected errors', () => {
    const accumulator = new CustomOutputsAccumulator(
      stubBackendOutputStorageStrategy,
      objectAccumulator
    );

    accumulateMock.mock.mockImplementationOnce(() => {
      throw new Error('unexpected error');
    });

    assert.throws(
      () => accumulator.addOutput({ custom: { output1: 'val1' } }),
      (error: AmplifyUserError) => {
        assert.strictEqual(error.message, 'unexpected error');
        return true;
      }
    );
  });

  void it('serializes accumulated config', () => {
    // This test needs real dependencies to test behavior of cdk.Lazy
    const stack = new Stack();
    const accumulator = new CustomOutputsAccumulator(
      new StackMetadataBackendOutputStorageStrategy(stack),
      new ObjectAccumulator<ClientConfig>({})
    );

    accumulator.addOutput({
      auth: {
        user_pool_id: 'some_user_pool_id',
      },
      custom: {
        output1: 'value1',
      },
    });
    accumulator.addOutput({
      custom: {
        output2: 'value2',
      },
    });

    const expectedAccumulatedOutput: DeepPartialAmplifyGeneratedConfigs<ClientConfig> =
      {
        auth: {
          user_pool_id: 'some_user_pool_id',
        },
        custom: {
          output1: 'value1',
          output2: 'value2',
        },
      };

    const template = Template.fromStack(stack);

    const customOutputValue =
      template.findOutputs('customOutputs').customOutputs.Value;
    assert.deepEqual(JSON.parse(customOutputValue), expectedAccumulatedOutput);
  });
});

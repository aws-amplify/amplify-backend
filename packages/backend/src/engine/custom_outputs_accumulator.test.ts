import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import { CustomOutputsAccumulator } from './custom_outputs_accumulator.js';
import {
  AmplifyUserError,
  ObjectAccumulator,
  ObjectAccumulatorPropertyAlreadyExistsError,
} from '@aws-amplify/platform-core';
import { ClientConfig } from '@aws-amplify/client-config';

void describe('Custom outputs accumulator', () => {
  const storeOutputMock = mock.fn();
  const stubBackendOutputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry> =
    {
      addBackendOutputEntry: storeOutputMock,
    };
  const objectAccumulator = new ObjectAccumulator<ClientConfig>({});
  const accumulateMock = mock.method(objectAccumulator, 'accumulate');

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
});

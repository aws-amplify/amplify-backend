import { DeepPartialAmplifyGeneratedConfigs } from '@aws-amplify/plugin-types';
import mergeWith from 'lodash.mergewith';

/**
 * This error is thrown when there's a collision in the object keys
 */
export class ObjectAccumulatorPropertyAlreadyExistsError extends Error {
  /**
   * Creates property already exists error.
   */
  constructor(
    readonly key: string,
    readonly existingValue: unknown,
    readonly incomingValue: unknown
  ) {
    super(`Property ${key} already exists`);
  }
}

/**
 * This error is thrown when partial objects with different versions are being accumulated
 */
export class ObjectAccumulatorVersionMismatchError extends Error {
  /**
   * Creates property already exists error.
   */
  constructor(readonly existingVersion: string, readonly newVersion: string) {
    super(
      `Version mismatch: Cannot accumulate new objects with version ${newVersion} with existing accumulated object with version ${existingVersion}`
    );
  }
}

/**
 * A class that can accumulate (squash merge) objects into single instance.
 */
export class ObjectAccumulator<T> {
  /**
   * creates object accumulator.
   */
  constructor(
    private readonly accumulator: DeepPartialAmplifyGeneratedConfigs<T>,
    private readonly versionKey = 'version'
  ) {}

  /**
   * Accumulate a new object part with accumulator.
   * This method throws if there is any intersection between the object parts
   * except for the versionKey, which should be the same across all object parts (nested objects included)
   * @param part a new object part to accumulate
   * @returns the accumulator object for easy chaining
   */
  accumulate = (
    part: DeepPartialAmplifyGeneratedConfigs<T>
  ): ObjectAccumulator<T> => {
    mergeWith(this.accumulator, part, (existingValue, incomingValue, key) => {
      if (Array.isArray(existingValue)) {
        return existingValue.concat(incomingValue);
      }
      if (existingValue && typeof existingValue !== 'object') {
        if (key === this.versionKey && existingValue !== incomingValue) {
          throw new ObjectAccumulatorVersionMismatchError(
            existingValue,
            incomingValue
          );
        } else if (key !== this.versionKey) {
          throw new ObjectAccumulatorPropertyAlreadyExistsError(
            key,
            existingValue,
            incomingValue
          );
        }
      }

      // returning undefined falls back to default merge algorithm
      return undefined;
    });
    return this;
  };

  getAccumulatedObject = () => {
    return this.accumulator;
  };
}

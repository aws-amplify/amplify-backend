import mergeWith from 'lodash.mergewith';

/**
 * This error is thrown when there's a collision in
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
 * A class that can accumulate (squash merge) objects into single instance.
 */
export class ObjectAccumulator<T> {
  /**
   * creates object accumulator.
   */
  constructor(private readonly accumulator: Partial<T>) {}

  accumulate = (part: Partial<T>): ObjectAccumulator<T> => {
    mergeWith(this.accumulator, part, (existingValue, incomingValue, key) => {
      if (Array.isArray(existingValue)) {
        return existingValue.concat(incomingValue);
      }
      if (existingValue && typeof existingValue !== 'object') {
        throw new ObjectAccumulatorPropertyAlreadyExistsError(
          key,
          existingValue,
          incomingValue
        );
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
